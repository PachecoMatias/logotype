import { z } from 'zod';

export const projectBacklogPhases = [
  'Análisis',
  'Diseño',
  'Desarrollo Frontend',
  'Desarrollo Backend',
  'Testing',
  'Despliegue',
];
export const projectBacklogPriorities = ['Alta', 'Media', 'Baja'];
export const projectBacklogRoles = [
  'Frontend',
  'Backend',
  'QA',
  'Ciberseguridad',
  'Analista de requerimientos',
  'Project Manager',
];
export const fibonacciEstimates = [1, 2, 3, 5, 8, 13, 21];
export const projectBacklogStoryFields = [
  'fase',
  'prioridad',
  'historia_usuario',
  'descripcion',
  'criterios_aceptacion',
  'alcance_tecnico',
  'estimacion_fibonacci',
  'rol_sugerido',
];

const nonBlankText = z.string().trim().min(1);

export const projectBacklogStorySchema = z.strictObject({
  fase: z.enum(projectBacklogPhases),
  prioridad: z.enum(projectBacklogPriorities),
  historia_usuario: nonBlankText,
  descripcion: nonBlankText,
  criterios_aceptacion: z.array(nonBlankText).min(1),
  alcance_tecnico: nonBlankText,
  estimacion_fibonacci: z.union(fibonacciEstimates.map((estimate) => z.literal(estimate))),
  rol_sugerido: z.enum(projectBacklogRoles),
});

export const persistedProjectBacklogStorySchema = projectBacklogStorySchema.extend({
  id: z.number().int().positive().max(4294967295),
});

export const projectBacklogSchema = z.array(projectBacklogStorySchema).min(12).max(25);

export const projectBacklogJsonSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: projectBacklogStoryFields,
    properties: {
      fase: { type: 'string' },
      prioridad: { type: 'string' },
      historia_usuario: { type: 'string' },
      descripcion: { type: 'string' },
      criterios_aceptacion: { type: 'array', items: { type: 'string' } },
      alcance_tecnico: { type: 'string' },
      estimacion_fibonacci: { type: 'integer' },
      rol_sugerido: { type: 'string' },
    },
  },
};
