import { GoogleGenAI } from '@google/genai';

import { parseGeminiEnvironment } from '../config/env.js';
import { projectAnalysisJsonSchema } from '../schemas/project-analysis.schema.js';
import { projectBacklogJsonSchema } from '../schemas/project-backlog.schema.js';

const providerStatusPattern = /^[A-Z][A-Z0-9_]{1,63}$/;

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

function createGatewayFailure(error, stage, model) {
  const providerDetails = stage === 'provider' ? parseApiErrorDetails(error) : {};
  const failure = new Error('Gemini gateway failed');
  failure.name = error?.name;
  failure.backlogFailureStage = stage;
  failure.providerStatus = error?.status ?? error?.statusCode;
  failure.providerSymbolicStatus = providerDetails.symbolicStatus;
  failure.providerReason = providerDetails.reason;
  failure.networkCode = error?.code;
  failure.configuredModel = model;
  return failure;
}

export function createGeminiGateway({
  createClient = (options) => new GoogleGenAI(options),
  getConfiguration = parseGeminiEnvironment,
  captureExchange,
} = {}) {
  async function generateStructuredContent(prompt, responseJsonSchema) {
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

    try {
      rawProviderText = response.text;
    } catch (error) {
      throw createGatewayFailure(error, 'response_text', model);
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
    async generateProjectAnalysis(prompt) {
      return generateStructuredContent(prompt, projectAnalysisJsonSchema);
    },

    async generateProjectBacklog(prompt) {
      return generateStructuredContent(prompt, projectBacklogJsonSchema);
    },
  };
}

export const geminiGateway = createGeminiGateway();
