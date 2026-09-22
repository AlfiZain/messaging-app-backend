import { z } from 'zod';
import { successResponse } from './common.openapi.js';

export const userSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    email: z.email(),
    displayName: z.string(),
    bio: z.string().nullable(),
    avatarUrl: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('User');

export const userResponseSchema = successResponse(
  z.object({
    user: userSchema,
  }),
  'UserResponse',
);

export const updateAvatarRequestSchema = z.object({
  avatar: z.any().openapi({
    type: 'string',
    format: 'binary',
  }),
});
