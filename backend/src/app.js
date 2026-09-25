import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import { proyectosRouter } from './routes/proyectos.routes.js';

export const app = express();

app.use(express.json({ limit: '256kb' }));
app.use('/api/proyectos', proyectosRouter);
app.use(notFound);
app.use(errorHandler);
