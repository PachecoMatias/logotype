import { z } from 'zod';

import {
  aspectos,
  maxHistorias,
  maxLargoHistoria,
  maxLargoIdea,
  maxLargoRespuesta,
  maxRespuestas,
} from '../config/advisor-config.js';

export const storyStates = ['entendida', 'supuesta', 'editada_cliente', 'sugerida_ia'];
export const questionTypes = ['opcion', 'texto', 'mixta'];
export const suggestionTypes = ['mejora', 'complementaria', 'etapas', 'definir'];
export const responseAspects = [...aspectos, 'aclaracion'];

const boundedText = (max, message) => z.string().trim().min(1).max(max, message);
const optionalUserList = z.array(z.string().trim().min(1).max(200)).max(maxHistorias);

export const advisorStorySchema = z.strictObject({
  id: boundedText(100, 'Story id is too long'),
  texto: boundedText(maxLargoHistoria, 'Story text is too long'),
  estado: z.enum(storyStates),
  bloqueada: z.boolean(),
  etapa: boundedText(100, 'Story stage is too long'),
  aDetallar: z.boolean(),
  funcionalidad: z.string().trim().max(200).nullable(),
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
    }),
    historias: z.array(advisorStorySchema).max(maxHistorias),
    respuestas: z.array(advisorAnswerSchema).max(maxRespuestas),
    sugerenciasRechazadas: z
      .array(z.string().trim().min(1).max(maxLargoRespuesta))
      .max(maxRespuestas),
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
});

export const advisorProviderEnvelopeSchema = z.strictObject({
  historias: z.array(z.unknown()),
  preguntas: z.array(z.unknown()),
  sugerencias: z.array(z.unknown()),
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
  required: ['aspecto', 'tipo', 'texto', 'opciones'],
  properties: {
    aspecto: { type: 'string' },
    tipo: { type: 'string' },
    texto: { type: 'string' },
    opciones: { type: 'array', items: { type: 'string' } },
  },
};
const providerSuggestionJsonSchema = {
  type: 'object',
  required: ['tipo', 'texto'],
  properties: { tipo: { type: 'string' }, texto: { type: 'string' } },
};

export const advisorRoundJsonSchema = {
  type: 'object',
  required: ['historias', 'preguntas', 'sugerencias', 'duda_critica'],
  properties: {
    historias: { type: 'array', items: providerStoryJsonSchema },
    preguntas: { type: 'array', items: providerQuestionJsonSchema },
    sugerencias: { type: 'array', items: providerSuggestionJsonSchema },
    duda_critica: { type: 'string' },
  },
};
