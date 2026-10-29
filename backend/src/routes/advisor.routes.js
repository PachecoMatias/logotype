import { Router } from 'express';

import * as advisorController from '../controllers/advisor.controller.js';
import { validate } from '../middleware/validate.js';
import { advisorRoundBodySchema } from '../schemas/advisor-round.schema.js';

export const advisorRouter = Router();

advisorRouter.post('/ronda', validate(advisorRoundBodySchema, 'body'), advisorController.round);
