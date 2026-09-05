import z from 'zod';

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be 1-50 characters')
    .optional(),
  bio: z
    .string()
    .trim()
    .max(250, 'Bio must not exceed 250 characters')
    .nullable()
    .optional(),
  avatarUrl: z.url().nullable().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password is required'),
    newPassword: z
      .string()
      .trim()
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain a special character'),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
