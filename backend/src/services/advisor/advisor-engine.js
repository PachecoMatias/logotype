import {
  aspectos,
  contextoPublico,
  funcionalidadesCatalogo,
  maxHistorias,
  maxPreguntasPorRonda,
  maxSugerenciasPorRonda,
  topeFuncionalidades,
  umbralGroundingSugerencias,
} from '../../config/advisor-config.js';
import {
  providerQuestionSchema,
  providerRefinementSchema,
  providerStorySchema,
  providerSuggestionSchema,
} from '../../schemas/advisor-round.schema.js';

export function isAspectCovered(storyId, aspect, answers) {
  return answers.some((answer) => answer.historiaId === storyId && answer.aspecto === aspect);
}

export function getPendingAspects(story) {
  return story.estado === 'a_completar' || story.estado === 'en_detalle' ? [...aspectos] : [];
}

export function isStoryComplete(story) {
  return !story.aDetallar && ['entendida', 'con_pendientes', 'supuesta'].includes(story.estado);
}

export function applyDetailLimit(stories) {
  return stories.map((story, index) => ({
    ...story,
    aDetallar: index >= topeFuncionalidades,
  }));
}

export function findFocus(stories, answers) {
  const active = stories.find(
    (story) =>
      !story.aDetallar &&
      story.estado === 'en_detalle' &&
      !answers.some((answer) => answer.historiaId === story.id && !answer.integrada),
  );
  return (
    active ?? stories.find((story) => !story.aDetallar && story.estado === 'a_completar') ?? null
  );
}

export function markPendingAnswersIntegrated(answers) {
  return answers.map((answer) => (answer.integrada ? answer : { ...answer, integrada: true }));
}

export function getRefinableStoryIds(stories, answers) {
  return getStoriesToRefine(stories, answers).map(({ id }) => id);
}

export function getStoriesToRefine(stories, answers) {
  return stories.flatMap((story) => {
    if (story.bloqueada) return [];
    const pendingAnswers = answers.filter(
      (answer) => answer.historiaId === story.id && !answer.integrada,
    );
    if (pendingAnswers.length === 0) return [];

    return [
      {
        id: story.id,
        texto: story.texto,
        respuestas: pendingAnswers,
      },
    ];
  });
}

export function closeStories(stories, answers) {
  return stories.map((story) => {
    if (story.bloqueada) return story;
    const hasPendingAnswer = answers.some(
      (answer) => answer.historiaId === story.id && !answer.integrada,
    );
    return hasPendingAnswer || !isStoryComplete(story)
      ? { ...story, estado: 'con_pendientes' }
      : story;
  });
}

function nextUniqueId(prefix, createId, usedIds) {
  let candidate;

  do {
    candidate = createId(prefix);
  } while (usedIds.has(candidate));

  return candidate;
}

function parseProviderStory(candidate, existingIds) {
  const result = providerStorySchema.safeParse(candidate);
  if (result.success) return { ...result.data, estado: 'a_completar' };

  if (!candidate || typeof candidate !== 'object' || existingIds.has(candidate.id)) return null;

  const recovered = providerStorySchema.safeParse({
    id: typeof candidate.id === 'string' ? candidate.id : '',
    texto: candidate.texto,
    estado: 'a_completar',
    etapa: candidate.etapa,
  });
  return recovered.success ? { ...recovered.data, estado: 'a_completar' } : null;
}

function mergeStories(rawStories, stories, answers, focusId, rewriteStoryIds, createId) {
  const existingIds = new Set(stories.map(({ id }) => id));
  const validProviderStories = rawStories.flatMap((candidate, providerIndex) => {
    const parsed = parseProviderStory(candidate, existingIds);
    return parsed ? [{ story: parsed, providerIndex }] : [];
  });
  const providerById = new Map(
    validProviderStories
      .map(({ story }) => story)
      .filter(({ id }) => id)
      .map((story) => [story.id, story]),
  );
  const usedIds = new Set(existingIds);
  const rewritableIds = new Set(rewriteStoryIds ?? (focusId ? [focusId] : []));
  const assignedAnonymousStories = new Set();

  for (const entry of validProviderStories) {
    if (entry.story.id) continue;

    const positionalStory = stories[entry.providerIndex];
    const availableIds = [...rewritableIds].filter((id) => !providerById.has(id));
    const targetId =
      positionalStory && availableIds.includes(positionalStory.id)
        ? positionalStory.id
        : availableIds.length === 1
          ? availableIds[0]
          : null;

    if (!targetId) continue;
    providerById.set(targetId, entry.story);
    assignedAnonymousStories.add(entry);
  }

  const merged = stories.map((story) => {
    const generated = providerById.get(story.id);

    if (!generated || story.bloqueada || !rewritableIds.has(story.id)) return story;

    return {
      ...story,
      texto: generated.texto,
      estado: generated.estado,
      etapa: generated.etapa,
    };
  });

  for (const entry of validProviderStories) {
    if (assignedAnonymousStories.has(entry)) continue;
    const generated = entry.story;
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
      origen: 'cliente',
    });
  }

  return applyDetailLimit(
    merged.map((story) => {
      const hasUnknownAnswer = answers.some(
        (answer) => answer.historiaId === story.id && answer.noSabe,
      );
      return hasUnknownAnswer && !story.bloqueada && story.estado === 'entendida'
        ? { ...story, estado: 'con_pendientes' }
        : story;
    }),
    answers,
  );
}

function enforceUnknownAnswerState(stories, answers) {
  return applyDetailLimit(
    stories.map((story) => {
      const hasUnknownAnswer = answers.some(
        (answer) => answer.historiaId === story.id && answer.noSabe,
      );
      return hasUnknownAnswer && !story.bloqueada && story.estado === 'entendida'
        ? { ...story, estado: 'con_pendientes' }
        : story;
    }),
  );
}

function isValidRefinedStoryText(text) {
  return text.length <= 400 && /^Como\b.+?,\s*quiero\b.+?,\s*para\b.+[.!?]?$/iu.test(text);
}

function recordItemDiscard(logValidationDiscard, section, index, field, code) {
  logValidationDiscard({
    section,
    index,
    path: `${section}[${index}]${field ? `.${field}` : ''}`,
    code,
  });
}

function parseRefinementCandidates(rawCandidates, source, logDiscard, logValidationDiscard) {
  return rawCandidates.map((candidate, index) => {
    const shaped =
      source === 'historias' && candidate && typeof candidate === 'object'
        ? { id: typeof candidate.id === 'string' ? candidate.id : '', texto: candidate.texto }
        : candidate;
    const result = providerRefinementSchema.safeParse(shaped);
    if (!result.success) {
      logDiscard('invalid_shape');
      for (const issue of result.error.issues) {
        recordItemDiscard(logValidationDiscard, source, index, issue.path.join('.'), issue.code);
      }
      return { index, refinement: null, source };
    }
    return { index, refinement: result.data, source };
  });
}

function assignRefinementCandidates({ entries, targetList, allTargets, assignments, logDiscard }) {
  const targetsById = new Map(targetList.map((target) => [target.id, target]));
  const idCounts = new Map();
  for (const { refinement } of entries) {
    if (!refinement?.id) continue;
    idCounts.set(refinement.id, (idCounts.get(refinement.id) ?? 0) + 1);
  }

  const assignedIndexes = new Set();
  for (const entry of entries) {
    const id = entry.refinement?.id;
    if (!id || !targetsById.has(id) || assignments.has(id)) continue;
    if (idCounts.get(id) !== 1) {
      logDiscard('duplicate_id');
      continue;
    }
    assignments.set(id, { ...entry, mapping: 'id' });
    assignedIndexes.add(entry.index);
  }

  if (entries.length !== allTargets.length) return;
  for (const entry of entries) {
    if (!entry.refinement || assignedIndexes.has(entry.index)) continue;
    const target = allTargets[entry.index];
    const id = entry.refinement.id;
    if (!target || !targetsById.has(target.id) || assignments.has(target.id)) continue;
    if (id && idCounts.get(id) > 1) continue;
    if (id && targetsById.has(id)) continue;
    assignments.set(target.id, { ...entry, mapping: 'posicional' });
  }
}

function applyProviderRefinements(
  rawRefinements,
  rawStories,
  stories,
  aRefinar,
  logDiscard,
  logValidationDiscard,
) {
  const assignments = new Map();
  const refinementEntries = parseRefinementCandidates(
    rawRefinements,
    'refinadas',
    logDiscard,
    logValidationDiscard,
  );
  assignRefinementCandidates({
    entries: refinementEntries,
    targetList: aRefinar,
    allTargets: aRefinar,
    assignments,
    logDiscard,
  });
  const unresolvedTargets = aRefinar.filter(({ id }) => !assignments.has(id));
  const storyEntries = parseRefinementCandidates(
    rawStories,
    'historias',
    logDiscard,
    logValidationDiscard,
  );
  assignRefinementCandidates({
    entries: storyEntries,
    targetList: unresolvedTargets,
    allTargets: aRefinar,
    assignments,
    logDiscard,
  });

  const integratedIds = new Set();
  const refinedById = new Map();
  const mappings = [];
  for (const target of aRefinar) {
    const entry = assignments.get(target.id);
    if (!entry?.refinement) {
      logDiscard('missing_mapping');
      mappings.push({ id: target.id, mapping: 'descartado', reason: 'missing_mapping' });
      continue;
    }

    const story = stories.find(({ id }) => id === target.id);
    if (!story || story.bloqueada || story.estado === 'editada_cliente') {
      logDiscard('protected_story');
      mappings.push({ id: target.id, mapping: 'descartado', reason: 'protected_story' });
      continue;
    }

    const text = entry.refinement.texto.trim();
    if (!isValidRefinedStoryText(text)) {
      logDiscard('invalid_text');
      recordItemDiscard(
        logValidationDiscard,
        entry.source,
        entry.index,
        'texto',
        'custom_invalid_story_format',
      );
      mappings.push({ id: target.id, mapping: 'descartado', reason: 'invalid_text' });
      continue;
    }
    if (entry.source === 'historias' && text === target.texto.trim()) {
      logDiscard('unchanged_story_fallback');
      recordItemDiscard(
        logValidationDiscard,
        entry.source,
        entry.index,
        'texto',
        'custom_unchanged_story',
      );
      mappings.push({
        id: target.id,
        mapping: 'descartado',
        reason: 'unchanged_story_fallback',
      });
      continue;
    }
    const hasSecondaryUnknown = target.respuestas.some(
      ({ aspecto, noSabe }) => noSabe && ['volumen', 'restricciones'].includes(aspecto),
    );
    const finalState = hasSecondaryUnknown
      ? 'con_pendientes'
      : (entry.refinement.estado ??
        (target.respuestas.some(({ noSabe }) => noSabe) ? 'con_pendientes' : 'entendida'));
    const onlyUnknownAnswers = target.respuestas.every(({ noSabe }) => noSabe);
    if (onlyUnknownAnswers && finalState !== 'supuesta' && text !== story.texto) {
      logDiscard('unknown_answer_changed_text');
      recordItemDiscard(
        logValidationDiscard,
        entry.source,
        entry.index,
        'texto',
        'custom_unknown_answer_change',
      );
      mappings.push({
        id: target.id,
        mapping: 'descartado',
        reason: 'unknown_answer_changed_text',
      });
      continue;
    }

    refinedById.set(target.id, { text, estado: finalState });
    mappings.push({ id: target.id, mapping: entry.mapping, source: entry.source });
    for (const answer of target.respuestas) integratedIds.add(answer.preguntaId);
  }

  const refinedStories = stories.map((story) => {
    const refinement = refinedById.get(story.id);
    return refinement ? { ...story, texto: refinement.text, estado: refinement.estado } : story;
  });
  return { stories: refinedStories, integratedIds: [...integratedIds], mappings };
}

export function reconcileInitialFunctionalities(stories, functionalities, createId) {
  const explicitFunctionalities = functionalities.slice(0, maxHistorias);
  if (explicitFunctionalities.length === 0) return stories;

  const usedIds = new Set(stories.map(({ id }) => id));
  const reconciled = explicitFunctionalities.map((functionality, index) => {
    const providerStory = stories[index];
    if (providerStory) {
      return {
        ...providerStory,
        origen: providerStory.origen ?? 'cliente',
        estado: 'a_completar',
        funcionalidad: functionality,
      };
    }

    const id = nextUniqueId('hu', createId, usedIds);
    usedIds.add(id);

    return {
      id,
      texto: `Como usuario, quiero usar ${functionality.toLocaleLowerCase('es')}, para facilitar mi trabajo.`,
      origen: 'cliente',
      estado: 'a_completar',
      bloqueada: false,
      etapa: String(index + 1),
      aDetallar: false,
      funcionalidad: functionality,
    };
  });

  for (const providerStory of stories.slice(explicitFunctionalities.length)) {
    if (reconciled.length === maxHistorias) break;
    reconciled.push(providerStory);
  }

  return applyDetailLimit(reconciled);
}

function processQuestions(
  rawQuestions,
  requestedAspects,
  createId,
  logDiscard,
  logValidationDiscard,
) {
  const requested = new Set(requestedAspects);
  const questions = rawQuestions
    .flatMap((candidate, index) => {
      const result = providerQuestionSchema.safeParse(candidate);
      if (!result.success) {
        logDiscard('invalid_shape');
        for (const issue of result.error.issues) {
          recordItemDiscard(
            logValidationDiscard,
            'preguntas',
            index,
            issue.path.join('.'),
            issue.code,
          );
        }
        return [];
      }
      return [{ ...result.data, providerIndex: index }];
    })
    .filter(({ aspecto, providerIndex }) => {
      const allowed = requested.has(aspecto);
      if (!allowed) {
        logDiscard('unexpected_aspect');
        recordItemDiscard(
          logValidationDiscard,
          'preguntas',
          providerIndex,
          'aspecto',
          'custom_unexpected_aspect',
        );
      }
      return allowed;
    })
    .slice(0, maxPreguntasPorRonda)
    .map((question) => ({
      id: createId('pregunta'),
      aspecto: question.aspecto,
      tipo: question.tipo,
      seleccion: question.seleccion,
      texto: question.texto,
      opciones: question.opciones,
      origen: 'ia',
    }));

  return questions;
}

function comparableText(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const suggestionStopWords = new Set([
  'a',
  'al',
  'algo',
  'cada',
  'como',
  'con',
  'de',
  'el',
  'en',
  'es',
  'del',
  'desde',
  'esta',
  'este',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'para',
  'pero',
  'porque',
  'que',
  'se',
  'sin',
  'su',
  'sus',
  'te',
  'tu',
  'una',
  'uno',
  'unos',
  'unas',
  'tus',
  'y',
]);

const groundingSynonyms = new Map([
  ['existencia', 'stock'],
  ['inventario', 'stock'],
  ['vender', 'venta'],
  ['vende', 'venta'],
  ['vendes', 'venta'],
  ['vendes', 'venta'],
  ['vendido', 'venta'],
  ['vendidos', 'venta'],
]);

function singularizeGroundingWord(word) {
  if (word.length > 5 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function normalizeGroundingText(value) {
  return comparableText(value)
    .split(' ')
    .filter(Boolean)
    .map((word) => groundingSynonyms.get(word) ?? singularizeGroundingWord(word))
    .join(' ');
}

function meaningfulWords(value) {
  return normalizeGroundingText(value)
    .split(' ')
    .filter((word) => word.length > 2 && !suggestionStopWords.has(word));
}

function textsAreSimilar(left, right) {
  const normalizedLeft = normalizeGroundingText(left);
  const normalizedRight = normalizeGroundingText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    return true;

  const leftWords = new Set(meaningfulWords(left));
  const rightWords = new Set(meaningfulWords(right));
  const smallerSize = Math.min(leftWords.size, rightWords.size);
  if (smallerSize === 0) return false;
  const overlap = [...leftWords].filter((word) => rightWords.has(word)).length;
  return overlap / smallerSize >= umbralGroundingSugerencias;
}

function suggestionTextIssue(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 25) return 'texto_fuera_de_limite';
  if ((text.match(/[.!?]+/g) ?? []).length > 1) return 'texto_multioracion';
  if (/\b(?:api|backend|endpoint|frontend|implementación|sugerencia de tipo)\b/i.test(text)) {
    return 'contenido_tecnico';
  }
  if (/\b(?:precio|presupuesto|plazo|fecha de entrega|viabilidad)\b/i.test(text)) {
    return 'contenido_prohibido';
  }
  const textWords = new Set(meaningfulWords(text));
  const outsideServices = contextoPublico.fueraDeAlcance.some((excluded) => {
    const excludedWords = meaningfulWords(excluded);
    if (excludedWords.length === 0) return false;
    const overlap = excludedWords.filter((word) => textWords.has(word)).length;
    return overlap / excludedWords.length >= umbralGroundingSugerencias;
  });
  if (outsideServices) {
    return 'fuera_servicios';
  }
  return null;
}

export function isGroundingCitationValid(citation, groundingTexts) {
  const normalizedCitation = normalizeGroundingText(citation);
  if (!normalizedCitation) return false;
  const normalizedContext = groundingTexts.map(normalizeGroundingText).filter(Boolean);
  if (normalizedContext.some((context) => context.includes(normalizedCitation))) return true;

  const citationWords = [...new Set(meaningfulWords(citation))];
  if (citationWords.length === 0) return false;
  const contextWords = new Set(normalizedContext.flatMap((value) => meaningfulWords(value)));
  const overlap = citationWords.filter((word) => contextWords.has(word)).length;
  return overlap / citationWords.length >= umbralGroundingSugerencias;
}

function objectiveTextIssue(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 12) return 'texto_fuera_de_limite';
  if (!/(?:ar|er|ir)$/i.test(words[0])) return 'sin_verbo_infinitivo';
  if (/\b(?:precio|presupuesto|plazo|fecha de entrega|viabilidad)\b/i.test(text)) {
    return 'contenido_prohibido';
  }
  return null;
}

export function processObjectives(
  rawObjectives = [],
  currentObjectives = [],
  { idea = '', procesoActual = '', historias = [], respuestas = [] } = {},
  logDiscard = () => {},
) {
  const groundingTexts = [
    idea,
    procesoActual,
    ...historias.map(({ texto }) => texto),
    ...respuestas.filter(({ noSabe }) => !noSabe).map(({ respuesta }) => respuesta),
  ];
  const validate = (candidate, providerShape) => {
    const texto = candidate?.texto?.trim();
    const basadoEn = (providerShape ? candidate?.basado_en : candidate?.basadoEn)?.trim();
    if (!texto || !basadoEn) {
      logDiscard('forma_invalida');
      return null;
    }
    const textIssue = objectiveTextIssue(texto);
    if (textIssue) {
      logDiscard(textIssue);
      return null;
    }
    if (!isGroundingCitationValid(basadoEn, groundingTexts)) {
      logDiscard('cita_no_fundada');
      return null;
    }
    return { texto, basadoEn };
  };
  const deduplicate = (items) => {
    const accepted = [];
    for (const item of items) {
      if (accepted.some(({ texto }) => textsAreSimilar(texto, item.texto))) {
        logDiscard('duplicado');
        continue;
      }
      accepted.push(item);
      if (accepted.length === 5) break;
    }
    return accepted;
  };
  const validCurrent = deduplicate(
    currentObjectives.map((item) => validate(item, false)).filter(Boolean),
  );
  const validProvider = deduplicate(
    rawObjectives.map((item) => validate(item, true)).filter(Boolean),
  );
  return validProvider.length > 0 ? validProvider : validCurrent;
}

function processSuggestions(
  rawSuggestions,
  rejectedSuggestions,
  shownSuggestions,
  { stories, answers, focusStoryId, suggestionsAllowed, suggestionContext },
  createId,
  logDiscard,
  logValidationDiscard,
) {
  if (!suggestionsAllowed || !focusStoryId) return [];

  const focusAnswers = answers.filter(
    (answer) =>
      answer.historiaId === focusStoryId &&
      !answer.integrada &&
      !answer.noSabe &&
      answer.respuesta.trim(),
  );
  const focusStory = stories.find(({ id }) => id === focusStoryId) ?? null;
  const groundingTexts = [
    suggestionContext?.idea ?? '',
    focusStory?.texto ?? '',
    focusStory?.funcionalidad ?? '',
    ...(suggestionContext?.datosIniciales?.funcionalidades ?? []),
    ...(suggestionContext?.datosIniciales?.plataformas ?? []),
    ...(suggestionContext?.datosIniciales?.tiposUsuario ?? []),
    ...funcionalidadesCatalogo,
    ...focusAnswers.map(({ respuesta }) => respuesta),
  ];

  const acceptedSuggestions = stories
    .filter(({ origen }) => origen === 'ia')
    .map(({ texto }) => texto);
  const existingStoryTexts = stories.map(({ texto }) => texto);
  const suggestions = [];
  const discardDetail = (candidate, motivo) => ({
    texto: typeof candidate?.texto === 'string' ? candidate.texto.slice(0, 200) : '',
    motivo,
    contextoPermitido: groundingTexts.map((value) => normalizeGroundingText(value)),
  });
  const discard = (reason, candidate, index, field = 'texto') => {
    logDiscard(reason, discardDetail(candidate, reason));
    recordItemDiscard(logValidationDiscard, 'sugerencias', index, field, `custom_${reason}`);
  };

  for (const [index, candidate] of rawSuggestions.entries()) {
    const result = providerSuggestionSchema.safeParse(candidate);
    if (!result.success) {
      logDiscard('invalid_shape', discardDetail(candidate, 'invalid_shape'));
      for (const issue of result.error.issues) {
        recordItemDiscard(
          logValidationDiscard,
          'sugerencias',
          index,
          issue.path.join('.'),
          issue.code,
        );
      }
      continue;
    }

    const { texto, basado_en: basedOn } = result.data;
    const textIssue = suggestionTextIssue(texto);
    if (textIssue) {
      discard(textIssue, result.data, index);
      continue;
    }
    if (!isGroundingCitationValid(basedOn, groundingTexts)) {
      discard('cita_no_fundada', result.data, index, 'basado_en');
      continue;
    }
    if (acceptedSuggestions.some((existing) => textsAreSimilar(texto, existing))) {
      discard('aceptada_previa', result.data, index);
      continue;
    }
    if (rejectedSuggestions.some((existing) => textsAreSimilar(texto, existing))) {
      discard('rechazada_previa', result.data, index);
      continue;
    }
    if (shownSuggestions.some((existing) => textsAreSimilar(texto, existing))) {
      discard('mostrada_previa', result.data, index);
      continue;
    }
    if (existingStoryTexts.some((existing) => textsAreSimilar(texto, existing))) {
      discard('duplicada_historia', result.data, index);
      continue;
    }
    if (suggestions.some((existing) => textsAreSimilar(texto, existing.texto))) {
      discard('duplicada_ronda', result.data, index);
      continue;
    }

    suggestions.push({ id: createId('sugerencia'), ...result.data, origen: 'ia' });
    if (suggestions.length === maxSugerenciasPorRonda) break;
  }

  return suggestions;
}

export function postprocessAdvisorOutput({
  raw,
  historias,
  respuestas,
  focusId,
  aRefinar = [],
  requestedAspects,
  sugerenciasRechazadas,
  sugerenciasMostradas = [],
  sugerenciasPermitidas = false,
  suggestionContext = null,
  logRefinementDiscard = () => {},
  logQuestionDiscard = () => {},
  logSuggestionDiscard = () => {},
  logValidationDiscard = () => {},
  createId,
}) {
  const baseStories =
    raw.historias.length > 0 && aRefinar.length === 0
      ? mergeStories(raw.historias, historias, respuestas, focusId, [], createId)
      : enforceUnknownAnswerState(historias, respuestas);
  const refinementResult = applyProviderRefinements(
    raw.refinadas ?? [],
    raw.historias ?? [],
    baseStories,
    aRefinar,
    logRefinementDiscard,
    logValidationDiscard,
  );
  const processedStories = enforceUnknownAnswerState(refinementResult.stories, respuestas);
  const alreadyClarified = respuestas.some(
    (answer) => answer.historiaId === focusId && answer.aspecto === 'aclaracion',
  );
  const criticalQuestion = raw.duda_critica.trim();
  const questions =
    raw.preguntas.length === 0 && criticalQuestion && focusId && !alreadyClarified
      ? [
          {
            id: createId('pregunta'),
            aspecto: 'aclaracion',
            tipo: 'texto',
            seleccion: 'unica',
            texto: criticalQuestion,
            opciones: [],
            origen: 'ia',
          },
        ]
      : processQuestions(
          raw.preguntas,
          requestedAspects,
          createId,
          logQuestionDiscard,
          logValidationDiscard,
        );

  return {
    historias: processedStories,
    preguntas: questions,
    sugerencias: processSuggestions(
      raw.sugerencias,
      sugerenciasRechazadas,
      sugerenciasMostradas,
      {
        stories: processedStories,
        answers: respuestas,
        focusStoryId: focusId ?? processedStories[0]?.id ?? null,
        suggestionsAllowed: sugerenciasPermitidas,
        suggestionContext,
      },
      createId,
      logSuggestionDiscard,
      logValidationDiscard,
    ),
    integradas: refinementResult.integratedIds,
    refinementMappings: refinementResult.mappings,
  };
}

export function buildProgress(stories, answers, forceComplete = false) {
  return {
    detalladas: stories.filter(({ aDetallar }) => !aDetallar).length,
    total: stories.length,
    completas: forceComplete
      ? stories.length
      : stories.filter((story) => isStoryComplete(story)).length,
    tope: topeFuncionalidades,
  };
}
