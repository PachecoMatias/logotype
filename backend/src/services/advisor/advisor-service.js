import { randomUUID } from 'node:crypto';

import {
  aspectos,
  maxPreguntasPorRonda,
  maxRondasSesion,
  maxSugerenciasPorRonda,
  minPreguntasPorHistoria,
  reparacionFaltantes,
} from '../../config/advisor-config.js';
import { AppError } from '../../errors/app-error.js';
import { geminiGateway } from '../../integrations/gemini.gateway.js';
import { buildRequirementsAdvisorPrompt } from '../../prompts/requirements-advisor.prompt.js';
import { normalizeProviderOutput } from '../../schemas/advisor-round.schema.js';
import {
  applyDetailLimit,
  buildProgress,
  closeStories,
  findFocus,
  getPendingAspects,
  getRefinableStoryIds,
  getStoriesToRefine,
  postprocessAdvisorOutput,
  processObjectives,
  reconcileInitialFunctionalities,
} from './advisor-engine.js';
import { advisorRateLimiter } from './advisor-rate-limiter.js';
import { appendAdvisorTrace } from './advisor-trace.js';

function unavailableError() {
  return new AppError(503, 'ADVISOR_UNAVAILABLE', 'Requirements advisor is unavailable');
}

function safeToken(value, pattern, fallback) {
  return typeof value === 'string' && pattern.test(value) ? value : fallback;
}

function createFailureDiagnostic(error, stage, environment) {
  const diagnostic = {
    stage,
    errorName: safeToken(error?.name, /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/, 'Error'),
  };
  const errorOrigin = safeToken(
    error?.errorOrigin,
    /^(?:configuration|network|provider_api|provider_sdk|sdk_type_error|response_access|response_shape)$/,
  );
  const status = error?.providerStatus ?? error?.status ?? error?.statusCode;
  const networkCode = safeToken(error?.networkCode ?? error?.code, /^[A-Z][A-Z0-9_]{1,31}$/);
  const causeCode = safeToken(error?.causeCode, /^[A-Z][A-Z0-9_]{1,63}$/);
  const providerStatus = safeToken(error?.providerSymbolicStatus, /^[A-Z][A-Z0-9_]{1,63}$/);
  const providerReason = safeToken(error?.providerReason, /^[a-z][a-z0-9_]{1,63}$/);
  const model = safeToken(error?.configuredModel, /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/);

  if (errorOrigin) diagnostic.errorOrigin = errorOrigin;
  if (typeof status === 'number' && Number.isFinite(status)) diagnostic.providerStatusCode = status;
  if (networkCode) diagnostic.networkCode = networkCode;
  if (causeCode) diagnostic.causeCode = causeCode;
  if (providerStatus) diagnostic.providerStatus = providerStatus;
  if (providerReason) diagnostic.providerReason = providerReason;
  if (model) diagnostic.model = model;
  if (environment === 'development') {
    if (typeof error?.message === 'string') diagnostic.message = error.message;
    if (typeof error?.stack === 'string') diagnostic.stack = error.stack;
  }

  return diagnostic;
}

function defaultFailureLogger(diagnostic) {
  const { stage, errorName, errorOrigin, providerStatusCode, networkCode, causeCode } = diagnostic;
  console.error(
    JSON.stringify({
      event: 'advisor_round_failed',
      stage,
      errorName,
      errorOrigin,
      providerStatusCode,
      networkCode,
      causeCode,
    }),
  );
}

function defaultRefinementDiscardLogger(reason) {
  console.warn(JSON.stringify({ event: 'advisor_refinement_discarded', reason }));
}

function defaultRoundLogger(event) {
  console.info(JSON.stringify({ event: 'advisor_round_completed', ...event }));
}

function defaultCreateId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

const emptyProviderResult = () => ({
  historias: [],
  refinadas: [],
  preguntas: [],
  sugerencias: [],
  objetivos: [],
  duda_critica: '',
});

function parseProviderResult(rawProviderText) {
  if (typeof rawProviderText !== 'string' || !rawProviderText.trim()) {
    return { raw: emptyProviderResult(), invalidSections: [], reason: 'empty' };
  }

  let parsed;

  try {
    parsed = JSON.parse(rawProviderText);
  } catch {
    return {
      raw: emptyProviderResult(),
      invalidSections: ['json'],
      reason: 'validation',
    };
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    return {
      raw: emptyProviderResult(),
      invalidSections: ['envelope'],
      reason: 'validation',
    };
  }

  const invalidSections = [];
  const raw = emptyProviderResult();
  for (const section of ['historias', 'refinadas', 'preguntas', 'sugerencias', 'objetivos']) {
    if (Array.isArray(parsed[section])) raw[section] = parsed[section];
    else if (section === 'objetivos' && parsed[section] === undefined) raw[section] = [];
    else invalidSections.push(section);
  }
  if (typeof parsed.duda_critica === 'string') raw.duda_critica = parsed.duda_critica;
  else invalidSections.push('duda_critica');

  const hasUsefulSection = [
    raw.historias,
    raw.refinadas,
    raw.preguntas,
    raw.sugerencias,
    raw.objetivos,
  ].some(
    ({ length }) => length > 0,
  );
  return {
    raw,
    invalidSections,
    reason: invalidSections.length > 0 ? 'validation' : hasUsefulSection ? null : 'empty',
  };
}

function classifyDegradation(error) {
  const status = error?.providerStatus ?? error?.status ?? error?.statusCode;
  const stage = error?.advisorFailureStage ?? error?.backlogFailureStage;
  const message = `${error?.providerReason ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (status === 429) return /quota|resource_exhausted/.test(message) ? 'quota' : 'rate_limit';
  if (
    error?.name === 'AbortError' ||
    ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET'].includes(error?.networkCode ?? error?.code)
  ) {
    return 'timeout';
  }
  if (
    status === 400 ||
    ['invalid_response_schema', 'response_schema_too_complex', 'other_invalid_argument'].includes(
      error?.providerReason,
    )
  ) {
    return 'validation';
  }
  if (
    (typeof status === 'number' && status >= 500) ||
    ['configuration', 'provider', 'response_text'].includes(stage)
  ) {
    return 'provider';
  }
  return 'otro';
}

function safeDiagnosticToken(value, pattern = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/) {
  return typeof value === 'string' && pattern.test(value) ? value : null;
}

function resolveErrorOrigin(error) {
  const declared = safeDiagnosticToken(
    error?.errorOrigin,
    /^(?:configuration|network|provider_api|provider_sdk|sdk_type_error|response_access|response_shape)$/,
  );
  if (declared) return declared;

  const stage = error?.advisorFailureStage ?? error?.backlogFailureStage;
  const status = error?.providerStatus ?? error?.status ?? error?.statusCode;
  if (stage === 'configuration') return 'configuration';
  if (stage === 'response_text') return 'response_shape';
  if (error?.name === 'TypeError') return 'sdk_type_error';
  if (error?.name === 'ApiError' || (Number.isInteger(status) && status >= 100 && status <= 599)) {
    return 'provider_api';
  }
  return 'provider_sdk';
}

function resolveMessageSanitized({ stage, origin, reason }) {
  if (stage === 'response_text') {
    return origin === 'response_access' ? 'unreadable_response_text' : 'missing_response_text';
  }
  if (origin === 'network') return 'network_failure';
  if (origin === 'sdk_type_error') return 'sdk_type_error';
  if (origin === 'configuration') return 'configuration_failure';
  return reason ?? (stage ? `${stage}_failure` : 'unclassified_provider_failure');
}

function buildProviderFailureTrace(error) {
  const stage = safeDiagnosticToken(
    error?.advisorFailureStage ?? error?.backlogFailureStage,
    /^(?:configuration|provider|response_text)$/,
  );
  const status = error?.providerStatus ?? error?.status ?? error?.statusCode;
  const statusCode = Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
  const reason = safeDiagnosticToken(error?.providerReason);
  const origin = resolveErrorOrigin(error);
  const hasResponseText =
    typeof error?.hasResponseText === 'boolean' ? error.hasResponseText : null;
  const hasCandidates = typeof error?.hasCandidates === 'boolean' ? error.hasCandidates : null;

  return {
    stage,
    statusCode,
    symbolicStatus: safeDiagnosticToken(error?.providerSymbolicStatus, /^[A-Z][A-Z0-9_]{1,63}$/),
    reason,
    errorOrigin: origin,
    networkCode: safeDiagnosticToken(error?.networkCode ?? error?.code),
    causeName: safeDiagnosticToken(error?.causeName),
    causeCode: safeDiagnosticToken(error?.causeCode),
    rawErrorName: safeDiagnosticToken(error?.rawErrorName ?? error?.name),
    finishReason: safeDiagnosticToken(error?.finishReason, /^[A-Z][A-Z0-9_]{1,63}$/),
    hasResponseText,
    hasCandidates,
    messageSanitized: resolveMessageSanitized({ stage, origin, reason }),
  };
}

function mergeValidation(target, source) {
  for (const section of Object.keys(target)) {
    target[section].received += source[section].received;
    target[section].valid += source[section].valid;
    target[section].discarded.push(...source[section].discarded);
  }
}

function mergeQuestions(primary, repaired) {
  const seenTexts = new Set();
  const merged = [];
  for (const question of [...primary, ...repaired]) {
    const key = question.texto.trim().toLocaleLowerCase('es');
    if (seenTexts.has(key)) continue;
    seenTexts.add(key);
    merged.push(question);
  }
  return merged.slice(0, maxPreguntasPorRonda);
}

export function createAdvisorService({
  gateway = geminiGateway,
  limiter = advisorRateLimiter,
  buildPrompt = buildRequirementsAdvisorPrompt,
  createId = defaultCreateId,
  logFailure = defaultFailureLogger,
  logRefinementDiscard = defaultRefinementDiscardLogger,
  logRound = defaultRoundLogger,
  traceRound = appendAdvisorTrace,
  refinamientoReintento = false,
  reparacionHabilitada = reparacionFaltantes,
  environment = process.env.NODE_ENV ?? 'development',
} = {}) {
  async function round(payload, { ip }) {
    const { sessionCalls } = limiter.consume(ip, payload.sesionId);
    const answers = payload.estado.respuestas;
    const hasPendingAnswers = payload.estado.respuestas.some(({ integrada }) => !integrada);
    let stories = applyDetailLimit(payload.estado.historias, answers);
    const initialRequest = stories.length === 0;
    if (initialRequest && payload.estado.datosIniciales.funcionalidades.length > 0) {
      stories = reconcileInitialFunctionalities(
        [],
        payload.estado.datosIniciales.funcionalidades,
        createId,
      );
    }
    let focus = findFocus(stories, answers);
    if (focus) {
      stories = stories.map((story) =>
        story.id === focus.id && story.estado === 'a_completar'
          ? { ...story, estado: 'en_detalle' }
          : story,
      );
      focus = stories.find(({ id }) => id === focus.id);
    }
    const aRefinar = getStoriesToRefine(stories, answers);
    const refinableStoryIds = getRefinableStoryIds(stories, answers);
    const closureReason = payload.cerrar
      ? 'cerrado_por_cliente'
      : sessionCalls === maxRondasSesion
        ? 'limite'
        : focus === null && stories.length > 0
          ? 'completo'
          : null;
    const mode =
      initialRequest && !closureReason
        ? 'INICIAL'
        : closureReason || focus === null
          ? 'CIERRE'
          : 'CONTINUAR';
    const requestedAspects =
      (mode === 'INICIAL' || mode === 'CONTINUAR') && focus
        ? getPendingAspects(focus, answers)
        : mode === 'INICIAL'
          ? [...aspectos]
          : [];
    const shouldCallProvider = mode === 'INICIAL' || mode === 'CONTINUAR' || hasPendingAnswers;
    const assumePending = ['cerrado_por_cliente', 'limite'].includes(closureReason);
    const focusAnswers = focus ? answers.filter(({ historiaId }) => historiaId === focus.id) : [];
    const firstSuggestionRound = mode === 'INICIAL' || Boolean(focus && focusAnswers.length === 0);
    const sugerenciasPermitidas = mode === 'INICIAL' || mode === 'CONTINUAR';
    const trace = {
      mode,
      focusId: focus?.id ?? null,
      aRefinarIds: aRefinar.map(({ id }) => id),
      providerCalled: false,
      providerAttempts: 0,
      providerError: null,
      providerFailure: null,
      invalidSections: [],
      validation: {
        historias: { received: 0, valid: 0, discarded: [] },
        refinadas: { received: 0, valid: 0, discarded: [] },
        preguntas: { received: 0, valid: 0, discarded: [] },
        sugerencias: { received: 0, valid: 0, discarded: [] },
        objetivos: { received: 0, valid: 0, discarded: [] },
      },
      refinadas: [],
      historias: [],
      providerQuestionCount: 0,
      questionOrigins: {},
      questionItems: [],
      mappings: [],
      fallbackCall: false,
      fallbackResult: 'not_requested',
      integrationCandidates: [],
      integradas: [],
      providerSuggestionCount: 0,
      preguntasPedidas: requestedAspects.length,
      preguntasRecibidas: 0,
      preguntasValidas: 0,
      aspectosPendientes: [...requestedAspects],
      sugerenciasRecibidas: 0,
      sugerenciasValidas: 0,
      objetivosRecibidos: 0,
      objetivosValidos: 0,
      objetivosDescartados: {},
      reparacion: { usada: false, resultado: 'no_necesaria' },
      sugerenciasResultado: 'pendiente',
      suggestionOrigins: {},
      suggestionItems: [],
      refinementOrigins: [],
      discardedSuggestions: {},
      ...(environment !== 'production' ? { discardDetail: [] } : {}),
      degradado: false,
      motivoDegradado: null,
    };

    if (!shouldCallProvider) {
      stories = assumePending ? closeStories(stories, answers) : stories;
      const objectiveDiscards = {};
      const objectives = processObjectives(
        [],
        payload.estado.objetivos,
        {
          idea: payload.estado.idea,
          procesoActual: payload.estado.datosIniciales.procesoActual,
          historias: stories,
          respuestas: answers,
        },
        (reason) => {
          objectiveDiscards[reason] = (objectiveDiscards[reason] ?? 0) + 1;
        },
      );
      const result = {
        historias: stories,
        foco: null,
        preguntas: [],
        sugerencias: [],
        integradas: [],
        degradado: false,
        motivoDegradado: null,
        objetivos: objectives,
        progreso: buildProgress(stories, answers, assumePending),
        completo: true,
        motivoCierre: closureReason ?? 'completo',
      };
      trace.integradas = result.integradas;
      trace.objetivosValidos = objectives.length;
      trace.objetivosDescartados = objectiveDiscards;
      logRound({
        mode,
        focusId: trace.focusId,
        providerAttempts: 0,
        degradado: false,
        motivoDegradado: null,
      });
      traceRound(trace);
      return result;
    }

    let processed;
    let degradationReason = null;
    let providerParseReason = null;
    const refinementDiscards = {};
    const questionDiscards = {};
    const prompt = buildPrompt({
      mode,
      focus: focus ? { historiaId: focus.id } : null,
      refinableStoryIds,
      aRefinar,
      sugerenciasPermitidas,
      requestedAspects,
      clientState: { ...payload.estado, historias: stories, respuestas: answers },
    });
    let rawProviderText = null;
    let providerError = null;
    trace.providerCalled = true;

    trace.providerAttempts = 1;
    try {
      rawProviderText = await gateway.generateAdvisorRound(prompt);
      providerError = null;
    } catch (error) {
      providerError = error;
    }

    let parsedProvider;
    if (providerError) {
      degradationReason = classifyDegradation(providerError);
      trace.providerError = degradationReason;
      trace.providerFailure = buildProviderFailureTrace(providerError);
      logFailure(
        createFailureDiagnostic(
          providerError,
          providerError?.advisorFailureStage ?? providerError?.backlogFailureStage ?? 'provider',
          environment,
        ),
      );
      parsedProvider = { raw: emptyProviderResult(), invalidSections: [], reason: null };
    } else {
      parsedProvider = parseProviderResult(rawProviderText);
      providerParseReason = parsedProvider.reason;
      trace.invalidSections = parsedProvider.invalidSections;
    }

    const unnormalizedRaw = parsedProvider.raw;
    trace.refinadas = unnormalizedRaw.refinadas.map((item) => ({
      id: typeof item?.id === 'string' ? item.id : null,
      hasText: typeof item?.texto === 'string' && item.texto.trim().length > 0,
    }));
    trace.historias = unnormalizedRaw.historias.map((item) => ({
      id: typeof item?.id === 'string' ? item.id : null,
      hasText: typeof item?.texto === 'string' && item.texto.trim().length > 0,
    }));
    trace.providerQuestionCount = unnormalizedRaw.preguntas.length;
    trace.providerSuggestionCount = unnormalizedRaw.sugerencias.length;
    trace.objetivosRecibidos = unnormalizedRaw.objetivos.length;
    trace.objetivosRecibidos = unnormalizedRaw.objetivos.length;
    const normalizedProvider = normalizeProviderOutput(unnormalizedRaw, requestedAspects);
    const raw = normalizedProvider.raw;
    trace.validation = normalizedProvider.validation;
    for (const [section, validation] of Object.entries(trace.validation)) {
      if (validation.discarded.length > 0 && !trace.invalidSections.includes(section)) {
        trace.invalidSections.push(section);
      }
    }
    const semanticallyDiscardedItems = new Set();
    let activeValidation = trace.validation;
    let validationPass = 1;
    const recordValidationDiscard = ({ section, index, path, code }) => {
      const validation = activeValidation[section];
      if (!validation) return;
      const itemKey = `${validationPass}:${section}:${index}`;
      if (!semanticallyDiscardedItems.has(itemKey)) {
        validation.valid = Math.max(0, validation.valid - 1);
        semanticallyDiscardedItems.add(itemKey);
      }
      if (!validation.discarded.some((item) => item.path === path && item.code === code)) {
        validation.discarded.push({ path, code });
      }
      if (!trace.invalidSections.includes(section)) trace.invalidSections.push(section);
    };

    const processingStories = stories;
    processed = postprocessAdvisorOutput({
      raw: initialRequest ? { ...raw, historias: [] } : raw,
      historias: processingStories,
      respuestas: answers,
      focusId: focus?.id ?? processingStories[0]?.id ?? null,
      aRefinar,
      requestedAspects,
      sugerenciasRechazadas: payload.estado.sugerenciasRechazadas,
      sugerenciasMostradas: payload.estado.sugerenciasMostradas,
      sugerenciasPermitidas,
      suggestionContext: {
        firstRound: firstSuggestionRound,
        idea: payload.estado.idea,
        datosIniciales: payload.estado.datosIniciales,
      },
      logRefinementDiscard: (reason) => {
        refinementDiscards[reason] = (refinementDiscards[reason] ?? 0) + 1;
        logRefinementDiscard(reason);
      },
      logQuestionDiscard: (reason) => {
        questionDiscards[reason] = (questionDiscards[reason] ?? 0) + 1;
      },
      logSuggestionDiscard: (reason, detail) => {
        trace.discardedSuggestions[reason] = (trace.discardedSuggestions[reason] ?? 0) + 1;
        if (trace.discardDetail && detail) trace.discardDetail.push(detail);
      },
      logValidationDiscard: recordValidationDiscard,
      createId,
    });
    trace.mappings = processed.refinementMappings;

    const missingQuestionCount = focus
      ? Math.max(0, minPreguntasPorHistoria - processed.preguntas.length)
      : 0;
    const suggestionNeeded = sugerenciasPermitidas && processed.sugerencias.length === 0;
    const repairNeeded = missingQuestionCount > 0 || suggestionNeeded;

    if (reparacionHabilitada && repairNeeded && !providerError && trace.providerAttempts < 2) {
      trace.reparacion = { usada: true, resultado: 'pendiente' };
      const repairFocusId = focus?.id ?? processed.historias[0]?.id ?? null;
      const repairPrompt = buildPrompt({
        mode,
        focus: repairFocusId ? { historiaId: repairFocusId } : null,
        refinableStoryIds: [],
        aRefinar: [],
        sugerenciasPermitidas: suggestionNeeded,
        requestedAspects,
        clientState: {
          ...payload.estado,
          historias: processed.historias,
          respuestas: answers,
          sugerenciasMostradas: [
            ...(payload.estado.sugerenciasMostradas ?? []),
            ...processed.sugerencias.map(({ texto }) => texto),
          ],
        },
        repair: {
          cantidadPreguntasFaltantes: missingQuestionCount,
          sugerenciaNecesaria: suggestionNeeded,
        },
      });

      trace.providerAttempts += 1;
      try {
        const repairParsed = parseProviderResult(await gateway.generateAdvisorRound(repairPrompt));
        trace.providerQuestionCount += repairParsed.raw.preguntas.length;
        trace.providerSuggestionCount += repairParsed.raw.sugerencias.length;
        const repairNormalized = normalizeProviderOutput(repairParsed.raw, []);
        validationPass = 2;
        activeValidation = repairNormalized.validation;
        const repairProcessed = postprocessAdvisorOutput({
          raw: repairNormalized.raw,
          historias: processed.historias,
          respuestas: answers,
          focusId: repairFocusId,
          aRefinar: [],
          requestedAspects,
          sugerenciasRechazadas: payload.estado.sugerenciasRechazadas,
          sugerenciasMostradas: [
            ...(payload.estado.sugerenciasMostradas ?? []),
            ...processed.sugerencias.map(({ texto }) => texto),
          ],
          sugerenciasPermitidas: suggestionNeeded,
          suggestionContext: {
            firstRound: firstSuggestionRound,
            idea: payload.estado.idea,
            datosIniciales: payload.estado.datosIniciales,
          },
          logQuestionDiscard: (reason) => {
            questionDiscards[reason] = (questionDiscards[reason] ?? 0) + 1;
          },
          logSuggestionDiscard: (reason, detail) => {
            trace.discardedSuggestions[reason] = (trace.discardedSuggestions[reason] ?? 0) + 1;
            if (trace.discardDetail && detail) trace.discardDetail.push(detail);
          },
          logValidationDiscard: recordValidationDiscard,
          createId,
        });
        mergeValidation(trace.validation, repairNormalized.validation);
        for (const [section, validation] of Object.entries(repairNormalized.validation)) {
          if (validation.discarded.length > 0 && !trace.invalidSections.includes(section)) {
            trace.invalidSections.push(section);
          }
        }
        processed = {
          ...processed,
          preguntas: mergeQuestions(processed.preguntas, repairProcessed.preguntas),
          sugerencias: [...processed.sugerencias, ...repairProcessed.sugerencias].slice(
            0,
            maxSugerenciasPorRonda,
          ),
        };
        const repairComplete =
          (!focus || processed.preguntas.length >= minPreguntasPorHistoria) &&
          (!suggestionNeeded || processed.sugerencias.length > 0);
        trace.reparacion.resultado = repairComplete ? 'completa' : 'parcial';
      } catch (error) {
        trace.reparacion.resultado = 'fallida';
        logFailure(
          createFailureDiagnostic(
            error,
            error?.advisorFailureStage ?? error?.backlogFailureStage ?? 'provider',
            environment,
          ),
        );
      } finally {
        activeValidation = trace.validation;
      }
    } else if (repairNeeded) {
      trace.reparacion.resultado = reparacionHabilitada ? 'sin_presupuesto' : 'deshabilitada';
    }

    const hasProviderQuestions = processed.preguntas.some(({ origen }) => origen === 'ia');
    if (!providerError && requestedAspects.length > 0) {
      degradationReason = hasProviderQuestions
        ? null
        : providerParseReason === 'validation' ||
            trace.invalidSections.length > 0 ||
            questionDiscards.invalid_shape
          ? 'validation'
          : 'incomplete_questions';
    }
    const integrated = new Set(processed.integradas);
    const unresolvedTargets = aRefinar.filter((target) =>
      target.respuestas.some(({ preguntaId }) => !integrated.has(preguntaId)),
    );
    if (
      !degradationReason &&
      refinamientoReintento &&
      unresolvedTargets.length > 0 &&
      trace.providerAttempts < 2
    ) {
      trace.fallbackCall = true;
      const retryPrompt = buildPrompt({
        mode: 'REFINAR',
        focus: null,
        refinableStoryIds: unresolvedTargets.map(({ id }) => id),
        aRefinar: unresolvedTargets,
        sugerenciasPermitidas: false,
        requestedAspects: [],
        clientState: {
          ...payload.estado,
          historias: processed.historias,
          respuestas: answers,
        },
      });
      try {
        trace.providerAttempts += 1;
        const retryParsed = parseProviderResult(await gateway.generateAdvisorRound(retryPrompt));
        const retryNormalized = normalizeProviderOutput(retryParsed.raw, []);
        const retryProcessed = postprocessAdvisorOutput({
          raw: retryNormalized.raw,
          historias: processed.historias,
          respuestas: answers,
          focusId: null,
          aRefinar: unresolvedTargets,
          requestedAspects: [],
          sugerenciasRechazadas: payload.estado.sugerenciasRechazadas,
          sugerenciasPermitidas: false,
          logRefinementDiscard,
          createId,
        });
        processed = {
          ...processed,
          historias: retryProcessed.historias,
          integradas: [...new Set([...processed.integradas, ...retryProcessed.integradas])],
          refinementMappings: [
            ...processed.refinementMappings,
            ...retryProcessed.refinementMappings,
          ],
        };
        trace.mappings = processed.refinementMappings;
        trace.fallbackResult =
          retryProcessed.integradas.length > 0 ? 'integrated' : 'still_pending';
      } catch (error) {
        degradationReason = classifyDegradation(error);
        trace.fallbackResult = 'failed';
      }
    }

    trace.integrationCandidates = [...processed.integradas];

    if (mode === 'INICIAL') {
      processed = {
        ...processed,
        historias: reconcileInitialFunctionalities(
          processed.historias,
          payload.estado.datosIniciales.funcionalidades,
          createId,
        ),
      };
    }

    if (mode === 'INICIAL' && processed.historias.length === 0) {
      const error = new Error('Initial round returned no stories');
      error.advisorFailureStage = 'postprocessing';
      logFailure(createFailureDiagnostic(error, 'postprocessing', environment));
      throw unavailableError();
    }

    stories = assumePending ? closeStories(processed.historias, answers) : processed.historias;
    focus = closureReason ? null : findFocus(stories, answers);
    if (focus) {
      stories = stories.map((story) =>
        story.id === focus.id && story.estado === 'a_completar'
          ? { ...story, estado: 'en_detalle' }
          : story,
      );
      focus = stories.find(({ id }) => id === focus.id);
    }
    trace.focusId = focus?.id ?? null;
    const complete = closureReason !== null || focus === null;
    const objectives = processObjectives(
      raw.objetivos,
      payload.estado.objetivos,
      {
        idea: payload.estado.idea,
        procesoActual: payload.estado.datosIniciales.procesoActual,
        historias: stories,
        respuestas: answers,
      },
      (reason) => {
        trace.objetivosDescartados[reason] = (trace.objetivosDescartados[reason] ?? 0) + 1;
      },
    );

    const result = {
      historias: stories,
      foco: focus ? { historiaId: focus.id } : null,
      preguntas: complete ? [] : processed.preguntas,
      sugerencias: processed.sugerencias,
      integradas: processed.integradas,
      objetivos: objectives,
      degradado: Boolean(degradationReason),
      motivoDegradado: degradationReason,
      progreso: buildProgress(stories, answers, assumePending),
      completo: complete,
      motivoCierre: closureReason ?? (complete ? 'completo' : null),
    };
    trace.integradas = result.integradas;
    trace.questionOrigins = result.preguntas.reduce((counts, { origen }) => {
      counts[origen] = (counts[origen] ?? 0) + 1;
      return counts;
    }, {});
    trace.questionItems = result.preguntas.map(({ id, aspecto, tipo, origen }) => ({
      id,
      aspecto,
      tipo,
      origen,
    }));
    trace.suggestionOrigins = result.sugerencias.reduce((counts, { origen }) => {
      counts[origen] = (counts[origen] ?? 0) + 1;
      return counts;
    }, {});
    trace.suggestionItems = result.sugerencias.map(({ id, tipo, origen }) => ({
      id,
      tipo,
      origen,
    }));
    trace.refinementOrigins = processed.refinementMappings
      .filter(({ mapping }) => mapping !== 'descartado')
      .map(({ id }) => ({ id, origen: 'ia' }));
    trace.preguntasRecibidas = trace.providerQuestionCount;
    trace.preguntasValidas = processed.preguntas.filter(({ origen }) => origen === 'ia').length;
    const finalQuestionAspects = new Set(processed.preguntas.map(({ aspecto }) => aspecto));
    trace.aspectosPendientes = requestedAspects.filter(
      (aspect) => !finalQuestionAspects.has(aspect),
    );
    trace.sugerenciasRecibidas = trace.providerSuggestionCount;
    trace.sugerenciasValidas = processed.sugerencias.filter(({ origen }) => origen === 'ia').length;
    trace.objetivosValidos = result.objetivos.length;
    trace.objetivosValidos = result.objetivos.length;
    trace.sugerenciasResultado =
      sugerenciasPermitidas && trace.sugerenciasValidas === 0
        ? 'sin_sugerencias'
        : 'con_sugerencias';
    trace.degradado = result.degradado;
    trace.motivoDegradado = result.motivoDegradado;
    logRound({
      mode,
      focusId: trace.focusId,
      providerAttempts: trace.providerAttempts,
      degradado: result.degradado,
      motivoDegradado: result.motivoDegradado,
    });
    traceRound(trace);
    return result;
  }

  return { round };
}

export const advisorService = createAdvisorService();
