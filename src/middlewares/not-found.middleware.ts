import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error.js';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, 'Route not found'));
}
