import z from 'zod';

export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message content is required')
    .max(5000, 'Message content must be not exceed 5000 characters'),
});

export const sendMessageEventSchema = z.object({
  conversationId: z.uuid({
    message: 'Conversation ID must be a valid UUID',
  }),
  content: createMessageSchema.shape.content,
});

export type createMessageInput = z.infer<typeof createMessageSchema>;
export type SendMessageEvent = z.infer<typeof sendMessageEventSchema>;
