import { Router } from 'express';

import * as historiasController from '../controllers/historias.controller.js';
import { validate } from '../middleware/validate.js';
import { storyIdParamsSchema, updateStoryBodySchema } from '../schemas/historias.schemas.js';

export const historiasRouter = Router();

historiasRouter.patch(
  '/:id',
  validate(storyIdParamsSchema, 'params'),
  validate(updateStoryBodySchema, 'body'),
  historiasController.update,
);
