import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { ApiError } from '../utils/api-error.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader)
    return next(new ApiError(401, 'Authentication required'));

  const [schema, token] = authorizationHeader.split(' ');
  if (schema !== 'Bearer' || !token) return null;

  try {
    const payload = verifyAccessToken(token);

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      next(new ApiError(401, 'Invalid token'));
      return;
    }

    req.userId = payload.sub;
    next();
  } catch {
    next(new ApiError(401, 'Invalid token'));
  }
}
