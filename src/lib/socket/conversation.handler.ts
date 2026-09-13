import type { Socket } from 'socket.io';
import { joinConversationSchema } from '../../schemas/conversation.schema.js';
import * as conversationService from '../../services/conversation.service.js';
import { getOnlineUserIds } from './presence.js';

export function registerConversationHandlers(socket: Socket) {
  socket.on('join_conversation', async (data: { conversationId?: string }) => {
    try {
      const result = joinConversationSchema.safeParse(data);

      if (!result.success) {
        socket.emit('conversation_error', {
          message: 'Validation failed',
          errors: result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      const { conversationId } = result.data;

      const { participants } =
        await conversationService.validateAndGetConversation(
          conversationId,
          socket.data.userId,
        );

      const room = `conversation:${conversationId}`;
      await socket.join(room);

      const onlineUserIds = getOnlineUserIds(
        participants.map((participant) => participant.user.id),
      );

      socket.emit('conversation_joined', {
        conversationId,
        onlineUserIds,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to join conversation';

      socket.emit('conversation_error', {
        message,
      });
    }
  });
}
