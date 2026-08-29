import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/api-error.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(
  schema: ZodType,
  target: ValidationTarget | ValidationTarget[] = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const targets = Array.isArray(target) ? target : [target];

    for (const t of targets) {
      const result = schema.safeParse(req[t]);

      if (!result.success) {
        const formattedErrors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return next(new ApiError(400, 'Validation failed', formattedErrors));
      }

      req[t] = result.data;
    }

    next();
  };
}
