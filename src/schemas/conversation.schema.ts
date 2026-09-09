import z from 'zod';

export const uuidSchema = (fieldName = 'ID') =>
  z.uuid({ message: `${fieldName} must be a valid UUID` });

export const createDirectConversationSchema = z.object({
  userId: uuidSchema('User ID'),
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

export const addConversationParticipantsParamsSchema = z.object({
  conversationId: uuidSchema('Conversation ID'),
});

export const addConversationParticipantsBodySchema = z.object({
  userIds: z
    .array(z.uuid({ message: 'User ID must be a valid UUID' }))
    .min(1, { message: 'At least one user is required' })
    .refine((ids) => new Set(ids).size === ids.length, {
      message: 'User IDs must be unique',
    }),
});

export const leaveGroupConversationParamsSchema = z.object({
  conversationId: uuidSchema('Conversation ID'),
});

export const getDetailUserConversationParamsSchema = z.object({
  conversationId: uuidSchema('Conversation ID'),
});

export const joinConversationSchema = z.object({
  conversationId: uuidSchema('Conversation ID'),
});

export type CreateDirectConversationInput = z.infer<
  typeof createDirectConversationSchema
>;

export type CreateGroupConversationInput = z.infer<
  typeof createGroupConversationSchema
>;

export type AddConversationParticipantInput = z.infer<
  typeof addConversationParticipantsBodySchema
>;
