import {
  aspectos,
  maxHistorias,
  maxPreguntasPorRonda,
  maxSugerenciasPorRonda,
  topeFuncionalidades,
} from '../../config/advisor-config.js';
import {
  providerQuestionSchema,
  providerStorySchema,
  providerSuggestionSchema,
} from '../../schemas/advisor-round.schema.js';

export function isAspectCovered(storyId, aspect, answers) {
  return answers.some((answer) => answer.historiaId === storyId && answer.aspecto === aspect);
}

export function getPendingAspects(story, answers) {
  return aspectos
    .filter((aspect) => !isAspectCovered(story.id, aspect, answers))
    .slice(0, maxPreguntasPorRonda);
}

export function isStoryComplete(story, answers) {
  return aspectos.every((aspect) => isAspectCovered(story.id, aspect, answers));
}

export function applyDetailLimit(stories) {
  return stories.map((story, index) => ({
    ...story,
    aDetallar: index >= topeFuncionalidades,
  }));
}

export function findFocus(stories, answers) {
  return stories.find((story) => !story.aDetallar && !isStoryComplete(story, answers)) ?? null;
}

export function markPendingAnswersIntegrated(answers) {
  return answers.map((answer) => (answer.integrada ? answer : { ...answer, integrada: true }));
}

export function closeStories(stories, answers) {
  return stories.map((story) => {
    if (story.bloqueada || isStoryComplete(story, answers)) return story;
    return { ...story, estado: 'supuesta' };
  });
}

function nextUniqueId(prefix, createId, usedIds) {
  let candidate;

  do {
    candidate = createId(prefix);
  } while (usedIds.has(candidate));

  return candidate;
}

function mergeStories(rawStories, stories, answers, focusId, createId) {
  const validProviderStories = rawStories.flatMap((candidate) => {
    const result = providerStorySchema.safeParse(candidate);
    return result.success ? [result.data] : [];
  });
  const providerById = new Map(
    validProviderStories.filter(({ id }) => id).map((story) => [story.id, story]),
  );
  const usedIds = new Set(stories.map(({ id }) => id));
  const merged = stories.map((story) => {
    const generated = providerById.get(story.id);

    if (!generated || story.bloqueada || story.id !== focusId) return story;

    return {
      ...story,
      texto: generated.texto,
      estado: generated.estado,
      etapa: generated.etapa,
    };
  });

  for (const generated of validProviderStories) {
    if (generated.id && usedIds.has(generated.id)) continue;
    if (merged.length >= maxHistorias) break;

    const id = generated.id || nextUniqueId('hu', createId, usedIds);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    merged.push({
      id,
      texto: generated.texto,
      estado: generated.estado,
      bloqueada: false,
      etapa: generated.etapa,
      aDetallar: false,
      funcionalidad: null,
    });
  }

  return applyDetailLimit(
    merged.map((story) => {
      const hasUnknownAnswer = answers.some(
        (answer) => answer.historiaId === story.id && answer.noSabe,
      );
      return hasUnknownAnswer && !story.bloqueada ? { ...story, estado: 'supuesta' } : story;
    }),
    answers,
  );
}

function normalizeText(value) {
  return value.trim().toLocaleLowerCase('es');
}

function processQuestions(rawQuestions, requestedAspects, createId) {
  const requested = new Set(requestedAspects);

  return rawQuestions
    .flatMap((candidate) => {
      const result = providerQuestionSchema.safeParse(candidate);
      return result.success ? [result.data] : [];
    })
    .filter(({ aspecto }) => requested.has(aspecto))
    .slice(0, maxPreguntasPorRonda)
    .map((question) => ({ id: createId('pregunta'), ...question }));
}

function processSuggestions(rawSuggestions, rejectedSuggestions, createId) {
  const seen = new Set(rejectedSuggestions.map(normalizeText));
  const suggestions = [];

  for (const candidate of rawSuggestions) {
    const result = providerSuggestionSchema.safeParse(candidate);
    if (!result.success) continue;

    const normalized = normalizeText(result.data.texto);
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    suggestions.push({ id: createId('sugerencia'), ...result.data });
    if (suggestions.length === maxSugerenciasPorRonda) break;
  }

  return suggestions;
}

export function postprocessAdvisorOutput({
  raw,
  historias,
  respuestas,
  focusId,
  requestedAspects,
  sugerenciasRechazadas,
  createId,
}) {
  const processedStories = mergeStories(raw.historias, historias, respuestas, focusId, createId);
  const alreadyClarified = respuestas.some(
    (answer) => answer.historiaId === focusId && answer.aspecto === 'aclaracion',
  );
  const criticalQuestion = raw.duda_critica.trim();
  const questions =
    criticalQuestion && focusId && !alreadyClarified
      ? [
          {
            id: createId('pregunta'),
            aspecto: 'aclaracion',
            tipo: 'texto',
            texto: criticalQuestion,
            opciones: [],
          },
        ]
      : processQuestions(raw.preguntas, requestedAspects, createId);

  return {
    historias: processedStories,
    preguntas: questions,
    sugerencias: processSuggestions(raw.sugerencias, sugerenciasRechazadas, createId),
  };
}

export function buildProgress(stories, answers, forceComplete = false) {
  return {
    detalladas: stories.filter(({ aDetallar }) => !aDetallar).length,
    total: stories.length,
    completas: forceComplete
      ? stories.length
      : stories.filter((story) => isStoryComplete(story, answers)).length,
    tope: topeFuncionalidades,
  };
}
