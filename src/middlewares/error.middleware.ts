import type { NextFunction, Request, Response } from 'express';
import { mapError } from '../utils/map-error.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    return next(err);
  }

  const error = mapError(err);

  if (error.statusCode === 500) {
    console.error('[UNHANDLED_ERROR]:', err);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors ?? null,
  });
}
