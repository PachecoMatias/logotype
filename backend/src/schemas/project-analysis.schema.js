import { z } from 'zod';

export const projectAnalysisSchema = z.strictObject({
  viable: z.boolean(),
  completitud: z.enum(['completo', 'falta_info']),
  campos_faltantes: z.array(z.string()),
  observaciones: z.string(),
  mensaje_para_cliente: z.string(),
});

export const projectAnalysisJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['viable', 'completitud', 'campos_faltantes', 'observaciones', 'mensaje_para_cliente'],
  properties: {
    viable: { type: 'boolean' },
    completitud: { type: 'string', enum: ['completo', 'falta_info'] },
    campos_faltantes: { type: 'array', items: { type: 'string' } },
    observaciones: { type: 'string' },
    mensaje_para_cliente: { type: 'string' },
  },
};
