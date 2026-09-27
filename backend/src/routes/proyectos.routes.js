import { Router } from 'express';

import * as proyectosController from '../controllers/proyectos.controller.js';
import { validate } from '../middleware/validate.js';
import { projectBodySchema, projectIdParamsSchema } from '../schemas/proyectos.schemas.js';

export const proyectosRouter = Router();

proyectosRouter.post('/', validate(projectBodySchema, 'body'), proyectosController.create);
proyectosRouter.get('/', proyectosController.list);
proyectosRouter.post(
  '/:id/analizar',
  validate(projectIdParamsSchema, 'params'),
  proyectosController.analyze,
);
proyectosRouter.post(
  '/:id/backlog',
  validate(projectIdParamsSchema, 'params'),
  proyectosController.generateBacklog,
);
proyectosRouter.get('/:id', validate(projectIdParamsSchema, 'params'), proyectosController.getById);
