import z from 'zod';

export const createDirectConversationSchema = z.object({
  userId: z.uuid({ message: 'Invalid user ID format (must be a valid UUID)' }),
});

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;
