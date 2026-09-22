import { z } from 'zod';
import { userSchema } from './user.openapi.js';
import { successResponse } from './common.openapi.js';

export const authResponseSchema = successResponse(
  z.object({
    token: z.string(),
    user: userSchema,
  }),
  'AuthResponse',
);
