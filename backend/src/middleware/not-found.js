import { AppError } from '../errors/app-error.js';

export function notFound(request, response, next) {
  next(new AppError(404, 'ROUTE_NOT_FOUND', 'Route not found'));
}
