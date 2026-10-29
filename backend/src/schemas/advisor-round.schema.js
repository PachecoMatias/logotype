import { z } from 'zod';

import {
  aspectos,
  maxHistorias,
  maxLargoHistoria,
  maxLargoIdea,
  maxLargoObjetivo,
  maxLargoProcesoActual,
  maxLargoRespuesta,
  maxObjetivos,
  maxRespuestas,
} from '../config/advisor-config.js';

export const storyOrigins = ['cliente', 'ia'];
export const storyStates = ['a_completar', 'en_detalle', 'entendida', 'con_pendientes', 'supuesta'];
const legacyStoryStates = ['editada_cliente', 'sugerida_ia'];
export const questionTypes = ['opcion', 'texto', 'mixta'];
export const questionSelections = ['unica', 'multiple'];
export const suggestionTypes = ['mejora', 'complementaria', 'etapas', 'definir'];
export const responseAspects = [...aspectos, 'aclaracion'];

const boundedText = (max, message) => z.string().trim().min(1).max(max, message);
const optionalUserList = z.array(z.string().trim().min(1).max(200)).max(maxHistorias);
const advisorObjectiveSchema = z.strictObject({
  texto: boundedText(maxLargoObjetivo, 'Objective text is too long'),
  basadoEn: boundedText(maxLargoRespuesta, 'Objective grounding is too long'),
});

export const advisorStorySchema = z
  .strictObject({
    id: boundedText(100, 'Story id is too long'),
    texto: boundedText(maxLargoHistoria, 'Story text is too long'),
    origen: z.enum(storyOrigins).optional(),
    estado: z.enum([...storyStates, ...legacyStoryStates]),
    bloqueada: z.boolean(),
    etapa: boundedText(100, 'Story stage is too long'),
    aDetallar: z.boolean(),
    funcionalidad: z.string().trim().max(200).nullable(),
  })
  .transform((story) => {
    if (story.estado === 'sugerida_ia') {
      return { ...story, origen: 'ia', estado: 'a_completar' };
    }
    if (story.estado === 'editada_cliente') {
      return { ...story, origen: 'cliente', estado: 'entendida' };
    }
    return { ...story, origen: story.origen ?? 'cliente' };
  });

export const advisorAnswerSchema = z
  .strictObject({
    preguntaId: boundedText(100, 'Question id is too long'),
    historiaId: boundedText(100, 'Story id is too long'),
    aspecto: z.enum(responseAspects),
    pregunta: boundedText(maxLargoRespuesta, 'Question text is too long'),
    respuesta: z.string().trim().max(maxLargoRespuesta, 'Answer text is too long'),
    noSabe: z.boolean(),
    integrada: z.boolean(),
  })
  .superRefine((answer, context) => {
    if (!answer.noSabe && answer.respuesta.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['respuesta'],
        message: 'Answer cannot be empty unless noSabe is true',
      });
    }
  });

export const advisorRoundBodySchema = z.strictObject({
  sesionId: boundedText(128, 'Session id is too long'),
  cerrar: z.boolean().optional().default(false),
  estado: z.strictObject({
    idea: boundedText(maxLargoIdea, 'Idea is too long'),
    datosIniciales: z.strictObject({
      funcionalidades: optionalUserList,
      plataformas: optionalUserList,
      tiposUsuario: optionalUserList,
      cantidadUsuarios: z.string().trim().max(100),
      procesoActual: boundedText(maxLargoProcesoActual, 'Current process is too long'),
    }),
    objetivos: z.array(advisorObjectiveSchema).max(maxObjetivos).default([]),
    historias: z.array(advisorStorySchema).max(maxHistorias),
    respuestas: z.array(advisorAnswerSchema).max(maxRespuestas),
    sugerenciasRechazadas: z
      .array(z.string().trim().min(1).max(maxLargoRespuesta))
      .max(maxRespuestas),
    sugerenciasMostradas: z
      .array(z.string().trim().min(1).max(maxLargoRespuesta))
      .max(maxRespuestas)
      .default([]),
  }),
});

export const providerStorySchema = z.strictObject({
  id: z.string(),
  texto: boundedText(maxLargoHistoria, 'Story text is too long'),
  estado: z.enum(storyStates),
  etapa: boundedText(100, 'Story stage is too long'),
});

export const providerQuestionSchema = z
  .strictObject({
    aspecto: z.enum(aspectos),
    tipo: z.enum(questionTypes),
    seleccion: z.enum(questionSelections).default('unica'),
    texto: boundedText(maxLargoRespuesta, 'Question text is too long'),
    opciones: z.array(z.string().trim().min(1).max(200)),
  })
  .superRefine((question, context) => {
    if (question.tipo === 'texto' && question.opciones.length !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opciones'],
        message: 'Text questions cannot include options',
      });
    }

    if (
      ['opcion', 'mixta'].includes(question.tipo) &&
      (question.opciones.length < 2 || question.opciones.length > 6)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opciones'],
        message: 'Option questions require between 2 and 6 options',
      });
    }
  });

export const providerSuggestionSchema = z.strictObject({
  tipo: z.enum(suggestionTypes),
  texto: boundedText(maxLargoRespuesta, 'Suggestion text is too long'),
  basado_en: boundedText(maxLargoRespuesta, 'Suggestion grounding is too long'),
  funcionalidad: boundedText(200, 'Suggestion functionality is too long'),
  descripcion: boundedText(maxLargoHistoria, 'Suggestion description is too long'),
});

export const providerObjectiveSchema = z.strictObject({
  texto: boundedText(maxLargoObjetivo, 'Objective text is too long'),
  basado_en: boundedText(maxLargoRespuesta, 'Objective grounding is too long'),
});

export const providerRefinementSchema = z.strictObject({
  id: z.string().optional().default(''),
  texto: z.string().max(maxLargoHistoria, 'Refined story text is too long'),
  estado: z.enum(['entendida', 'con_pendientes', 'supuesta']).optional(),
});

function normalizedToken(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const aspectAliases = new Map([
  ['quien_la_usa', 'quien_la_usa'],
  ['quien_usa', 'quien_la_usa'],
  ['usuario', 'quien_la_usa'],
  ['usuarios', 'quien_la_usa'],
  ['beneficio', 'beneficio'],
  ['comportamiento', 'comportamiento'],
  ['datos_previos', 'datos_previos'],
  ['datos', 'datos_previos'],
  ['volumen', 'volumen'],
  ['restricciones', 'restricciones'],
  ['restriccion', 'restricciones'],
]);

const questionTypeAliases = new Map([
  ['opcion', 'opcion'],
  ['opciones', 'opcion'],
  ['seleccion', 'opcion'],
  ['texto', 'texto'],
  ['abierta', 'texto'],
  ['mixta', 'mixta'],
]);

const suggestionTypeAliases = new Map([
  ['mejora', 'mejora'],
  ['mejoras', 'mejora'],
  ['complementaria', 'complementaria'],
  ['complementario', 'complementaria'],
  ['complementario_a', 'complementaria'],
  ['etapa', 'etapas'],
  ['etapas', 'etapas'],
  ['definir', 'definir'],
]);

const storyStateAliases = new Map([
  ['a_completar', 'a_completar'],
  ['en_detalle', 'en_detalle'],
  ['entendida', 'entendida'],
  ['con_pendientes', 'con_pendientes'],
  ['supuesta', 'supuesta'],
  ['editada_cliente', 'entendida'],
  ['sugerida_ia', 'a_completar'],
]);

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeOptions(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[|\n,]+/)
      : [];
  const normalized = [];
  const seen = new Set();

  for (const item of values) {
    const option = String(item).trim().replace(/\s+/g, ' ');
    const token = normalizedToken(option);
    const isReserved =
      /^(?:otra|otro|otras|otros)(?:_opcion|_respuesta)?$/.test(token) ||
      /^(?:ninguna|ninguno)(?:_de_(?:las|los)_(?:anteriores|opciones))?$/.test(token) ||
      /^(?:no_se|nose|no_lo_se)$/.test(token);
    if (!option || isReserved || seen.has(token)) continue;
    seen.add(token);
    normalized.push(option);
  }

  return normalized;
}

function normalizeStory(candidate, index) {
  const item =
    candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
  return {
    id: typeof item.id === 'string' ? item.id.trim() : '',
    texto: normalizeString(item.texto),
    estado: storyStateAliases.get(normalizedToken(item.estado)) ?? 'a_completar',
    etapa:
      typeof item.etapa === 'string' || typeof item.etapa === 'number'
        ? String(item.etapa).trim() || String(index + 1)
        : String(index + 1),
  };
}

function normalizeRefinement(candidate) {
  const item =
    candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
  return {
    id: typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id).trim() : '',
    texto: normalizeString(item.texto),
    estado: storyStateAliases.get(normalizedToken(item.estado)),
  };
}

function normalizeQuestion(candidate, index, requestedAspects) {
  const item =
    candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
  const opciones = normalizeOptions(item.opciones);
  const expectedAspect = requestedAspects[index];
  const normalizedAspect = aspectAliases.get(normalizedToken(item.aspecto));
  const knownType = questionTypeAliases.get(normalizedToken(item.tipo));
  const optionType = knownType ?? (opciones.length > 0 ? 'mixta' : 'texto');
  const tipo =
    ['opcion', 'mixta'].includes(optionType) && opciones.length < 2 ? 'texto' : optionType;
  return {
    aspecto:
      expectedAspect && normalizedAspect !== expectedAspect
        ? expectedAspect
        : (normalizedAspect ?? expectedAspect ?? ''),
    tipo,
    seleccion: ['opcion', 'mixta'].includes(tipo) ? 'multiple' : 'unica',
    texto: normalizeString(item.texto),
    opciones: tipo === 'texto' ? [] : opciones,
  };
}

function normalizeSuggestion(candidate) {
  const item =
    candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
  return {
    tipo: suggestionTypeAliases.get(normalizedToken(item.tipo)) ?? 'complementaria',
    texto: normalizeString(item.texto),
    basado_en: normalizeString(item.basado_en),
    funcionalidad: normalizeString(item.funcionalidad),
    descripcion: normalizeString(item.descripcion),
  };
}

function normalizeObjective(candidate) {
  const item =
    candidate && !Array.isArray(candidate) && typeof candidate === 'object' ? candidate : {};
  return {
    texto: normalizeString(item.texto),
    basado_en: normalizeString(item.basado_en),
  };
}

function issuePath(section, index, path) {
  return `${section}[${index}]${path.map((segment) => `.${segment}`).join('')}`;
}

function normalizeSection(section, candidates = [], schema, normalizer) {
  const valid = [];
  const discarded = [];
  candidates.forEach((candidate, index) => {
    const result = schema.safeParse(normalizer(candidate, index));
    if (result.success) {
      valid.push(result.data);
      return;
    }
    for (const issue of result.error.issues) {
      discarded.push({ path: issuePath(section, index, issue.path), code: issue.code });
    }
  });
  return {
    values: valid,
    telemetry: { received: candidates.length, valid: valid.length, discarded },
  };
}

export function normalizeProviderOutput(raw, requestedAspects = []) {
  const stories = normalizeSection('historias', raw.historias, providerStorySchema, normalizeStory);
  const refinements = normalizeSection(
    'refinadas',
    raw.refinadas,
    providerRefinementSchema,
    normalizeRefinement,
  );
  const questions = normalizeSection(
    'preguntas',
    raw.preguntas,
    providerQuestionSchema,
    (candidate, index) => normalizeQuestion(candidate, index, requestedAspects),
  );
  const suggestions = normalizeSection(
    'sugerencias',
    raw.sugerencias,
    providerSuggestionSchema,
    normalizeSuggestion,
  );
  const objectives = normalizeSection(
    'objetivos',
    raw.objetivos,
    providerObjectiveSchema,
    normalizeObjective,
  );
  return {
    raw: {
      historias: stories.values,
      refinadas: refinements.values,
      preguntas: questions.values,
      sugerencias: suggestions.values,
      objetivos: objectives.values,
      duda_critica: raw.duda_critica.trim(),
    },
    validation: {
      historias: stories.telemetry,
      refinadas: refinements.telemetry,
      preguntas: questions.telemetry,
      sugerencias: suggestions.telemetry,
      objetivos: objectives.telemetry,
    },
  };
}

export const advisorProviderEnvelopeSchema = z.strictObject({
  historias: z.array(z.unknown()),
  refinadas: z.array(z.unknown()),
  preguntas: z.array(z.unknown()),
  sugerencias: z.array(z.unknown()),
  objetivos: z.array(z.unknown()),
  duda_critica: z.string().max(maxLargoRespuesta),
});

const providerStoryJsonSchema = {
  type: 'object',
  required: ['id', 'texto', 'estado', 'etapa'],
  properties: {
    id: { type: 'string' },
    texto: { type: 'string' },
    estado: { type: 'string' },
    etapa: { type: 'string' },
  },
};
const providerQuestionJsonSchema = {
  type: 'object',
  required: ['aspecto', 'tipo', 'seleccion', 'texto', 'opciones'],
  properties: {
    aspecto: { type: 'string' },
    tipo: { type: 'string' },
    seleccion: { type: 'string' },
    texto: { type: 'string' },
    opciones: { type: 'array', items: { type: 'string' } },
  },
};
const providerSuggestionJsonSchema = {
  type: 'object',
  required: ['tipo', 'texto', 'basado_en', 'funcionalidad', 'descripcion'],
  properties: {
    tipo: { type: 'string' },
    texto: { type: 'string' },
    basado_en: { type: 'string' },
    funcionalidad: { type: 'string' },
    descripcion: { type: 'string' },
  },
};
const providerRefinementJsonSchema = {
  type: 'object',
  required: ['texto', 'estado'],
  properties: {
    id: { type: 'string' },
    texto: { type: 'string' },
    estado: { type: 'string' },
  },
};
const providerObjectiveJsonSchema = {
  type: 'object',
  required: ['texto', 'basado_en'],
  properties: {
    texto: { type: 'string' },
    basado_en: { type: 'string' },
  },
};

export const advisorRoundJsonSchema = {
  type: 'object',
  required: ['historias', 'refinadas', 'preguntas', 'sugerencias', 'objetivos', 'duda_critica'],
  properties: {
    historias: { type: 'array', items: providerStoryJsonSchema },
    refinadas: { type: 'array', items: providerRefinementJsonSchema },
    preguntas: { type: 'array', items: providerQuestionJsonSchema },
    sugerencias: { type: 'array', items: providerSuggestionJsonSchema },
    objetivos: { type: 'array', items: providerObjectiveJsonSchema },
    duda_critica: { type: 'string' },
  },
};
