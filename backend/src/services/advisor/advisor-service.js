import { randomUUID } from 'node:crypto';

import { aspectos, maxPreguntasPorRonda, maxRondasSesion } from '../../config/advisor-config.js';
import { AppError } from '../../errors/app-error.js';
import { geminiGateway } from '../../integrations/gemini.gateway.js';
import { buildRequirementsAdvisorPrompt } from '../../prompts/requirements-advisor.prompt.js';
import { advisorProviderEnvelopeSchema } from '../../schemas/advisor-round.schema.js';
import {
  applyDetailLimit,
  buildProgress,
  closeStories,
  findFocus,
  getPendingAspects,
  markPendingAnswersIntegrated,
  postprocessAdvisorOutput,
} from './advisor-engine.js';
import { advisorRateLimiter } from './advisor-rate-limiter.js';

function unavailableError() {
  return new AppError(503, 'ADVISOR_UNAVAILABLE', 'Requirements advisor is unavailable');
}

function safeToken(value, pattern, fallback) {
  return typeof value === 'string' && pattern.test(value) ? value : fallback;
}

function createFailureDiagnostic(error, stage) {
  const diagnostic = {
    stage,
    errorName: safeToken(error?.name, /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/, 'Error'),
  };
  const status = error?.providerStatus ?? error?.status ?? error?.statusCode;
  const networkCode = safeToken(error?.networkCode ?? error?.code, /^[A-Z][A-Z0-9_]{1,31}$/);
  const providerStatus = safeToken(error?.providerSymbolicStatus, /^[A-Z][A-Z0-9_]{1,63}$/);
  const providerReason = safeToken(error?.providerReason, /^[a-z][a-z0-9_]{1,63}$/);
  const model = safeToken(error?.configuredModel, /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/);

  if (typeof status === 'number' && Number.isFinite(status)) diagnostic.providerStatusCode = status;
  if (networkCode) diagnostic.networkCode = networkCode;
  if (providerStatus) diagnostic.providerStatus = providerStatus;
  if (providerReason) diagnostic.providerReason = providerReason;
  if (model) diagnostic.model = model;

  return diagnostic;
}

function defaultFailureLogger(diagnostic) {
  console.error(JSON.stringify({ event: 'advisor_round_failed', ...diagnostic }));
}

function defaultCreateId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function parseProviderResult(rawProviderText) {
  if (typeof rawProviderText !== 'string' || !rawProviderText.trim()) {
    const error = new Error('Empty provider response');
    error.advisorFailureStage = 'response_text';
    throw error;
  }

  let parsed;

  try {
    parsed = JSON.parse(rawProviderText);
  } catch (error) {
    error.advisorFailureStage = 'json_parse';
    throw error;
  }

  const result = advisorProviderEnvelopeSchema.safeParse(parsed);
  if (!result.success) {
    const error = new Error('Invalid provider response');
    error.advisorFailureStage = 'schema_validation';
    throw error;
  }

  return result.data;
}

export function createAdvisorService({
  gateway = geminiGateway,
  limiter = advisorRateLimiter,
  buildPrompt = buildRequirementsAdvisorPrompt,
  createId = defaultCreateId,
  logFailure = defaultFailureLogger,
} = {}) {
  async function round(payload, { ip }) {
    const { sessionCalls } = limiter.consume(ip, payload.sesionId);
    const answers = markPendingAnswersIntegrated(payload.estado.respuestas);
    const hasPendingAnswers = payload.estado.respuestas.some(({ integrada }) => !integrada);
    let stories = applyDetailLimit(payload.estado.historias, answers);
    let focus = findFocus(stories, answers);
    const closureReason = payload.cerrar
      ? 'cerrado_por_cliente'
      : sessionCalls === maxRondasSesion
        ? 'limite'
        : focus === null && stories.length > 0
          ? 'completo'
          : null;
    const mode =
      stories.length === 0 && !closureReason
        ? 'INICIAL'
        : closureReason || focus === null
          ? 'CIERRE'
          : 'CONTINUAR';
    const requestedAspects =
      mode === 'INICIAL'
        ? aspectos.slice(0, maxPreguntasPorRonda)
        : focus
          ? getPendingAspects(focus, answers)
          : [];
    const shouldCallProvider = mode === 'INICIAL' || mode === 'CONTINUAR' || hasPendingAnswers;
    const assumePending = ['cerrado_por_cliente', 'limite'].includes(closureReason);

    if (!shouldCallProvider) {
      stories = assumePending ? closeStories(stories, answers) : stories;
      return {
        historias: stories,
        foco: null,
        preguntas: [],
        sugerencias: [],
        progreso: buildProgress(stories, answers, assumePending),
        completo: true,
        motivoCierre: closureReason ?? 'completo',
      };
    }

    let processed;

    try {
      const prompt = buildPrompt({
        mode,
        focus: focus ? { historiaId: focus.id } : null,
        requestedAspects,
        clientState: { ...payload.estado, historias: stories, respuestas: answers },
      });
      const rawProviderText = await gateway.generateAdvisorRound(prompt);
      const raw = parseProviderResult(rawProviderText);
      processed = postprocessAdvisorOutput({
        raw,
        historias: stories,
        respuestas: answers,
        focusId: focus?.id ?? null,
        requestedAspects,
        sugerenciasRechazadas: payload.estado.sugerenciasRechazadas,
        createId,
      });

      if (mode === 'INICIAL' && processed.historias.length === 0) {
        const error = new Error('Initial round returned no stories');
        error.advisorFailureStage = 'postprocessing';
        throw error;
      }
    } catch (error) {
      logFailure(
        createFailureDiagnostic(
          error,
          error?.advisorFailureStage ?? error?.backlogFailureStage ?? 'provider',
        ),
      );
      throw unavailableError();
    }

    stories = assumePending ? closeStories(processed.historias, answers) : processed.historias;
    focus = closureReason ? null : findFocus(stories, answers);
    const complete = closureReason !== null || focus === null;

    return {
      historias: stories,
      foco: focus ? { historiaId: focus.id } : null,
      preguntas: complete ? [] : processed.preguntas,
      sugerencias: processed.sugerencias,
      progreso: buildProgress(stories, answers, assumePending),
      completo: complete,
      motivoCierre: closureReason ?? (complete ? 'completo' : null),
    };
  }

  return { round };
}

export const advisorService = createAdvisorService();
