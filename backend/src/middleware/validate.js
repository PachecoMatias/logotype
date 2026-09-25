import { AppError } from '../errors/app-error.js';

function toSafeDetails(issues) {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

export function validate(schema, location) {
  return (request, response, next) => {
    const result = schema.safeParse(request[location]);

    if (!result.success) {
      next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Request validation failed',
          toSafeDetails(result.error.issues),
        ),
      );
      return;
    }

    request[location] = result.data;
    next();
  };
}
