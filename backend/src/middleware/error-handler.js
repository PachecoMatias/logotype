import { AppError } from '../errors/app-error.js';

function isRequestValidationError(error) {
  return error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large';
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (isRequestValidationError(error)) {
    response.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
    });
    return;
  }

  if (error instanceof AppError) {
    const errorBody = {
      code: error.code,
      message: error.message,
    };

    if (error.details?.length) {
      errorBody.details = error.details;
    }

    response.status(error.status).json({ success: false, error: errorBody });
    return;
  }

  response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
}
