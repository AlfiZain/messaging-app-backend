import z from 'zod';

export const createDirectConversationSchema = z.object({
  userId: z.uuid({ message: 'Invalid user ID format (must be a valid UUID)' }),
});

export const createGroupConversationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Group name is required' })
    .max(100, { message: 'Group name must not exceed 100 characters' }),

  participantIds: z
    .array(z.uuid({ message: 'Participant ID must be a valid UUID' }))
    .min(1, { message: 'At least one participant is required' })
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'Participant IDs must be unique',
    }),
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

export type CreateGroupConversationInput = z.infer<
  typeof createGroupConversationSchema
>;
