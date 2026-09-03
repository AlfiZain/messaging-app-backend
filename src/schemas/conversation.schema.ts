import z from 'zod';

export const createDirectConversationSchema = z.object({
  userId: z.uuid({ message: 'Invalid user ID format (must be a valid UUID)' }),
});

export const getDetailUserConversationParamsSchema = z.object({
  conversationId: z.uuid({ message: 'Conversation Id must be a valid UUID' }),
});

export const joinConversationSchema = z.object({
  conversationId: z.uuid({
    message: 'Conversation ID must be a valid UUID',
  }),
});

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;
