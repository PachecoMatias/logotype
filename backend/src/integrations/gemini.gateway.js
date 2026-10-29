import { GoogleGenAI } from '@google/genai';

import { advisorMaxOutputTokens, advisorThinkingBudget } from '../config/advisor-config.js';
import { parseGeminiEnvironment } from '../config/env.js';
import { advisorRoundJsonSchema } from '../schemas/advisor-round.schema.js';
import { projectAnalysisJsonSchema } from '../schemas/project-analysis.schema.js';
import { projectBacklogJsonSchema } from '../schemas/project-backlog.schema.js';

const providerStatusPattern = /^[A-Z][A-Z0-9_]{1,63}$/;
const diagnosticNamePattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const diagnosticCodePattern = /^[A-Za-z][A-Za-z0-9_]{1,63}$/;
const networkErrorCodes = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);
const networkMessagePattern =
  /fetch failed|failed to fetch|network error|socket hang up|terminated/i;

function safeDiagnosticName(value) {
  return typeof value === 'string' && diagnosticNamePattern.test(value) ? value : null;
}

function safeDiagnosticCode(value) {
  return typeof value === 'string' && diagnosticCodePattern.test(value) ? value : null;
}

function collectErrorChain(error) {
  const chain = [];
  const seen = new Set();
  let current = error;

  while (current && typeof current === 'object' && chain.length < 3 && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function detectNetworkCause(error) {
  for (const entry of collectErrorChain(error)) {
    const code = safeDiagnosticCode(entry?.code);

    if (code && networkErrorCodes.has(code)) return { name: safeDiagnosticName(entry?.name), code };
    if (entry?.name === 'AbortError' || entry?.name === 'TimeoutError') {
      return { name: entry.name, code };
    }
    if (
      entry?.name === 'TypeError' &&
      typeof entry.message === 'string' &&
      networkMessagePattern.test(entry.message)
    ) {
      return { name: 'TypeError', code };
    }
  }

  return null;
}

function isProviderApiError(error) {
  const status = error?.status ?? error?.statusCode;
  return error?.name === 'ApiError' || (Number.isInteger(status) && status >= 100 && status <= 599);
}

function classifyErrorOrigin(error, stage, networkCause) {
  if (stage === 'configuration') return 'configuration';
  if (stage === 'response_text') return 'response_shape';
  if (networkCause) return 'network';
  if (isProviderApiError(error)) return 'provider_api';
  if (error?.name === 'TypeError') return 'sdk_type_error';
  return 'provider_sdk';
}

function classifyProviderReason(status, message) {
  const normalizedMessage = message.slice(0, 2048).toLowerCase();

  if (
    (normalizedMessage.includes('response schema') &&
      (normalizedMessage.includes('too complex') || normalizedMessage.includes('complexity'))) ||
    normalizedMessage.includes('schema produces a constraint that has too many states')
  ) {
    return 'response_schema_too_complex';
  }

  if (normalizedMessage.includes('response schema')) {
    return 'invalid_response_schema';
  }

  if (
    /api[ _-]?key/.test(normalizedMessage) &&
    /(invalid|not valid|expired|missing)/.test(normalizedMessage)
  ) {
    return 'invalid_api_key';
  }

  if (
    normalizedMessage.includes('model') &&
    /(invalid|not found|does not exist|unsupported|not supported)/.test(normalizedMessage)
  ) {
    return 'invalid_model';
  }

  return status === 'INVALID_ARGUMENT' ? 'other_invalid_argument' : undefined;
}

function parseApiErrorDetails(error) {
  if (error?.name !== 'ApiError' || typeof error.message !== 'string') {
    return {};
  }

  try {
    const errorBody = JSON.parse(error.message);
    const providerError = errorBody?.error;

    if (!providerError || Array.isArray(providerError) || typeof providerError !== 'object') {
      return {};
    }

    const symbolicStatus = providerStatusPattern.test(providerError.status)
      ? providerError.status
      : undefined;
    const reason =
      typeof providerError.message === 'string'
        ? classifyProviderReason(symbolicStatus, providerError.message)
        : undefined;
    return { symbolicStatus, reason };
  } catch {
    return {};
  }
}

function createGatewayFailure(error, stage, model, responseMetadata = {}) {
  const providerDetails = stage === 'provider' ? parseApiErrorDetails(error) : {};
  const errorChain = collectErrorChain(error);
  const cause = errorChain[1] ?? null;
  const networkCause = detectNetworkCause(error);
  const failure = new Error('Gemini gateway failed');
  failure.name = error?.name ?? 'GeminiGatewayError';
  failure.backlogFailureStage = stage;
  failure.providerStatus = error?.status ?? error?.statusCode;
  failure.providerSymbolicStatus = providerDetails.symbolicStatus;
  failure.providerReason = providerDetails.reason;
  failure.errorOrigin = responseMetadata.origin ?? classifyErrorOrigin(error, stage, networkCause);
  failure.networkCode = safeDiagnosticCode(error?.code);
  failure.causeName = safeDiagnosticName(cause?.name);
  failure.causeCode = safeDiagnosticCode(cause?.code) ?? networkCause?.code ?? null;
  failure.rawErrorName = error?.name ?? null;
  failure.finishReason = responseMetadata.finishReason ?? null;
  failure.hasResponseText = responseMetadata.hasResponseText ?? null;
  failure.hasCandidates = responseMetadata.hasCandidates ?? null;
  failure.configuredModel = model;
  return failure;
}

function readResponseShape(response) {
  if (response === null || response === undefined || typeof response !== 'object') {
    return {
      readable: false,
      hasCandidates: false,
      candidateCount: 0,
      finishReason: null,
    };
  }

  const candidates = Array.isArray(response.candidates) ? response.candidates : null;
  const finishReason = candidates?.[0]?.finishReason;

  return {
    readable: true,
    hasCandidates: Boolean(candidates && candidates.length > 0),
    candidateCount: candidates?.length ?? 0,
    finishReason: typeof finishReason === 'string' ? finishReason : null,
  };
}

export function createGeminiGateway({
  createClient = (options) => new GoogleGenAI(options),
  getConfiguration = parseGeminiEnvironment,
  captureExchange,
} = {}) {
  async function generateStructuredContent(prompt, responseJsonSchema, generationConfig = {}) {
    let client;
    let model;

    try {
      const configuration = getConfiguration();
      model = configuration.model;
      client = createClient({ apiKey: configuration.apiKey });
    } catch (error) {
      throw createGatewayFailure(error, 'configuration', model);
    }

    const config = {
      responseMimeType: 'application/json',
      responseJsonSchema,
      ...generationConfig,
    };
    let response;

    try {
      response = await client.models.generateContent({
        model,
        contents: prompt,
        config,
      });
    } catch (error) {
      throw createGatewayFailure(error, 'provider', model);
    }

    let rawProviderText;
    let shape;

    try {
      shape = readResponseShape(response);
    } catch (error) {
      throw createGatewayFailure(error, 'response_text', model, {
        origin: 'response_access',
        hasResponseText: false,
      });
    }

    if (!shape.readable) {
      const error = new Error('Provider response was missing or not an object');
      error.name = 'ProviderResponseError';
      throw createGatewayFailure(error, 'response_text', model, {
        origin: 'response_shape',
        finishReason: shape.finishReason,
        hasResponseText: false,
        hasCandidates: shape.hasCandidates,
      });
    }

    try {
      rawProviderText = response.text;
    } catch (error) {
      throw createGatewayFailure(error, 'response_text', model, {
        origin: 'response_access',
        finishReason: shape.finishReason,
        hasResponseText: false,
        hasCandidates: shape.hasCandidates,
      });
    }

    if (typeof rawProviderText !== 'string' || rawProviderText.trim().length === 0) {
      const error = new Error('Provider response did not contain text');
      error.name = 'ProviderResponseError';
      throw createGatewayFailure(error, 'response_text', model, {
        origin: 'response_shape',
        finishReason: shape.finishReason,
        hasResponseText: false,
        hasCandidates: shape.hasCandidates,
      });
    }

    if (captureExchange) {
      captureExchange({
        request: { contents: prompt, model, config },
        rawProviderText,
      });
    }

    return rawProviderText;
  }

  return {
    async generateAdvisorRound(prompt) {
      return generateStructuredContent(prompt, advisorRoundJsonSchema, {
        maxOutputTokens: advisorMaxOutputTokens,
        thinkingConfig: { thinkingBudget: advisorThinkingBudget },
      });
    },

    async generateProjectAnalysis(prompt) {
      return generateStructuredContent(prompt, projectAnalysisJsonSchema, {
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingBudget: 1024 },
      });
    },

    async generateProjectBacklog(prompt) {
      return generateStructuredContent(prompt, projectBacklogJsonSchema);
    },
  };
}

export const geminiGateway = createGeminiGateway();
