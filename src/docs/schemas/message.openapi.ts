import { z } from 'zod';
import { successResponse } from './common.openapi.js';

export const messageSenderSchema = z
  .object({
    id: z.uuid(),
    displayName: z.string(),
    avatarUrl: z.string().nullable(),
  })
  .openapi('MessageSender');

const messageFieldsSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderId: z.uuid(),
  content: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
  readAt: z.string().datetime().nullable(),
});

export const messageSchema = messageFieldsSchema
  .extend({
    sender: messageSenderSchema,
  })
  .openapi('Message');

export const messageResponseSchema = successResponse(
  z.object({
    message: messageSchema,
  }),
  'MessageResponse',
);

export const messagesResponseSchema = successResponse(
  z.object({
    messages: z.array(messageSchema),
  }),
  'MessagesResponse',
);

export const messageStatusResponseSchema = successResponse(
  z.object({
    message: messageFieldsSchema,
  }),
  'MessageStatusResponse',
);

export const createImageMessageRequestSchema = z.object({
  content: z.string().max(5000).optional().openapi({
    description: 'Optional message content',
  }),

  image: z.any().openapi({
    type: 'string',
    format: 'binary',
    description: 'Message image',
  }),
});
