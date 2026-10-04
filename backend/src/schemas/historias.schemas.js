import { z } from 'zod';

import { projectBacklogStorySchema } from './project-backlog.schema.js';

export const storyIdParamsSchema = z.strictObject({
  id: z
    .string()
    .regex(/^\d+$/, 'Story id must be an unsigned integer')
    .transform((value) => Number(value))
    .pipe(z.number().int().positive().max(4294967295)),
});

export const updateStoryBodySchema = projectBacklogStorySchema
  .omit({ fase: true })
  .partial()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one editable story field is required',
  });
