import z from 'zod';

export const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .max(5000, 'Message content must be not exceed 5000 characters')
    .default(''),
});

export const sendMessageEventSchema = z.object({
  conversationId: z.uuid({
    message: 'Conversation ID must be a valid UUID',
  }),
  content: createMessageSchema.shape.content,
});

export const messageStatusSchema = z.object({
  conversationId: z.uuid({
    message: 'Conversation ID must be a valid UUID',
  }),
  messageId: z.uuid({
    message: 'Message ID must be a valid UUID',
  }),
});

export const messageStatusParamsSchema = z.object({
  conversationId: z.uuid({
    message: 'Conversation ID must be a valid UUID',
  }),
  messageId: z.uuid({
    message: 'Message ID must be a valid UUID',
  }),
});

export type createMessageInput = z.infer<typeof createMessageSchema>;
export type SendMessageEvent = z.infer<typeof sendMessageEventSchema>;
export type MessageStatusInput = z.infer<typeof messageStatusSchema>;
