import z from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be 1-50 characters'),
  bio: z
    .string()
    .trim()
    .max(250, 'Bio must not exceed 250 characters')
    .nullable()
    .optional(),
  avatarUrl: z.url().nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
