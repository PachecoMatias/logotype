import { z } from 'zod';

export const projectCriterionIds = [
  'completitud',
  'ajuste_servicios',
  'alcance_vs_plazo',
  'presupuesto_vs_alcance',
  'capacidad_equipo',
  'riesgos_tecnicos',
];

const criterionSchema = z.strictObject({
  id: z.enum(projectCriterionIds),
  estado: z.enum(['cumple', 'atencion', 'no_cumple', 'sin_datos']),
  justificacion: z.string(),
});

const titledDetailSchema = z.strictObject({ titulo: z.string(), detalle: z.string() });
const riskSchema = z.strictObject({
  titulo: z.string(),
  detalle: z.string(),
  impacto: z.enum(['bajo', 'medio', 'alto']),
  mitigacion: z.string(),
});
const missingInformationSchema = z.strictObject({
  dato: z.string(),
  por_que_importa: z.string(),
});

function clipLists(analysis) {
  return {
    ...analysis,
    fortalezas: analysis.fortalezas.slice(0, 8),
    debilidades: analysis.debilidades.slice(0, 8),
    riesgos: analysis.riesgos.slice(0, 8),
    informacion_faltante: analysis.informacion_faltante.slice(0, 8),
    condiciones_para_avanzar: analysis.condiciones_para_avanzar.slice(0, 8),
    preguntas_para_el_cliente: analysis.preguntas_para_el_cliente.slice(0, 8),
    supuestos: analysis.supuestos.slice(0, 8),
  };
}

const projectAnalysisShape = {
  lectura_general: z.string(),
  nivel_de_riesgo: z.enum(['bajo', 'medio', 'alto']),
  razon_nivel_riesgo: z.string(),
  criterios: z.array(criterionSchema),
  fortalezas: z.array(titledDetailSchema),
  debilidades: z.array(titledDetailSchema),
  riesgos: z.array(riskSchema),
  informacion_faltante: z.array(missingInformationSchema),
  condiciones_para_avanzar: z.array(z.string()),
  preguntas_para_el_cliente: z.array(z.string()),
  supuestos: z.array(z.string()),
};

function requireCriteria(analysis, context) {
  const ids = analysis.criterios.map((criterion) => criterion.id);
  if (
    ids.length !== projectCriterionIds.length ||
    projectCriterionIds.some((id) => ids.filter((candidate) => candidate === id).length !== 1)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['criterios'],
      message: 'Criteria must contain each required id exactly once',
    });
  }
}

export const projectAnalysisSchema = z
  .strictObject(projectAnalysisShape)
  .superRefine((analysis, context) => {
    requireCriteria(analysis, context);
  })
  .transform(clipLists);

export const legacyProjectAnalysisSchema = z.strictObject({
  viable: z.boolean(),
  completitud: z.enum(['completo', 'falta_info']),
  campos_faltantes: z.array(z.string()),
  observaciones: z.string(),
  mensaje_para_cliente: z.string(),
});

export const storedProjectAnalysisSchema = z.union([
  z
    .strictObject({
      version: z.literal(2),
      ...projectAnalysisShape,
      senales: z.record(z.string(), z.unknown()),
    })
    .superRefine((analysis, context) => requireCriteria(analysis, context))
    .transform(clipLists),
  legacyProjectAnalysisSchema,
]);

const stringArray = { type: 'array', items: { type: 'string' } };
const titledDetailObject = {
  type: 'object',
  required: ['titulo', 'detalle'],
  properties: { titulo: { type: 'string' }, detalle: { type: 'string' } },
};

export const projectAnalysisJsonSchema = {
  type: 'object',
  required: [
    'lectura_general',
    'nivel_de_riesgo',
    'razon_nivel_riesgo',
    'criterios',
    'fortalezas',
    'debilidades',
    'riesgos',
    'informacion_faltante',
    'condiciones_para_avanzar',
    'preguntas_para_el_cliente',
    'supuestos',
  ],
  properties: {
    lectura_general: { type: 'string' },
    nivel_de_riesgo: { type: 'string' },
    razon_nivel_riesgo: { type: 'string' },
    criterios: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'estado', 'justificacion'],
        properties: {
          id: { type: 'string' },
          estado: { type: 'string' },
          justificacion: { type: 'string' },
        },
      },
    },
    fortalezas: { type: 'array', items: titledDetailObject },
    debilidades: { type: 'array', items: titledDetailObject },
    riesgos: {
      type: 'array',
      items: {
        type: 'object',
        required: ['titulo', 'detalle', 'impacto', 'mitigacion'],
        properties: {
          titulo: { type: 'string' },
          detalle: { type: 'string' },
          impacto: { type: 'string' },
          mitigacion: { type: 'string' },
        },
      },
    },
    informacion_faltante: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dato', 'por_que_importa'],
        properties: { dato: { type: 'string' }, por_que_importa: { type: 'string' } },
      },
    },
    condiciones_para_avanzar: stringArray,
    preguntas_para_el_cliente: stringArray,
    supuestos: stringArray,
  },
};
