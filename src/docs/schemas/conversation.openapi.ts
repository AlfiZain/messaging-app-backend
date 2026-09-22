import { z } from 'zod';
import { successResponse } from './common.openapi.js';

export const conversationParticipantSchema = z
  .object({
    joinedAt: z.string().datetime(),
    user: z.object({
      id: z.uuid(),
      displayName: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  })
  .openapi('ConversationParticipant');

export const conversationSchema = z
  .object({
    id: z.uuid(),
    type: z.enum(['DIRECT', 'GROUP']),
    directKey: z.string().nullable(),
    name: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    participants: z.array(conversationParticipantSchema),
  })
  .openapi('Conversation');

export const conversationResponseSchema = successResponse(
  z.object({
    conversation: conversationSchema,
  }),
  'ConversationResponse',
);

export const conversationsResponseSchema = successResponse(
  z.object({
    conversations: z.array(conversationSchema),
  }),
  'ConversationsResponse',
);

export const participantsResponseSchema = successResponse(
  z.object({
    participants: z.array(conversationParticipantSchema),
  }),
  'ConversationParticipantsResponse',
);
