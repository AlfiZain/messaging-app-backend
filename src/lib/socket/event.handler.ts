import type { Server } from 'socket.io';
import { eventEmitter } from '../../configs/event-emitter.js';
import * as conversationRepository from '../../repositories/conversation.repository.js';

export function registerEventHandler(io: Server) {
  eventEmitter.on('message:created', (message) => {
    const room = `conversation:${message.conversationId}`;

    io.to(room).emit('new_message', { message });
  });

  eventEmitter.on(
    'message:delivered',
    ({ messageId, conversationId, senderId, userId, timestamp }) => {
      const room = `user:${senderId}`;

      io.to(room).emit('message_delivered', {
        messageId,
        conversationId,
        userId,
        deliveredAt: timestamp,
      });
    },
  );

  eventEmitter.on(
    'message:read',
    ({ messageId, conversationId, senderId, userId, timestamp }) => {
      const room = `user:${senderId}`;

      io.to(room).emit('message_read', {
        messageId,
        conversationId,
        userId,
        readAt: timestamp,
      });
    },
  );

  eventEmitter.on(
    'conversation:participants_added',
    ({ conversation, addedParticipants, onlineUserIds }) => {
      const room = `conversation:${conversation.id}`;

      io.to(room).emit('participant_added', {
        conversationId: conversation.id,
        participants: addedParticipants,
        onlineUserIds,
      });

      for (const participant of addedParticipants) {
        io.to(`user:${participant.user.id}`).emit('conversation_added', {
          conversation,
          onlineUserIds,
        });
      }
    },
  );

  eventEmitter.on(
    'conversation:participant_left',
    async ({ conversationId, userId }) => {
      const room = `conversation:${conversationId}`;

      io.to(room).emit('participant_left', { conversationId, userId });

      io.to(`user:${userId}`).emit('conversation_removed', { conversationId });

      const sockets = await io.in(`user:${userId}`).fetchSockets();

      for (const socket of sockets) {
        socket.leave(room);
      }
    },
  );

  eventEmitter.on('presence:user_online', async ({ userId }) => {
    const conversations =
      await conversationRepository.findConversationsByUserId(userId);

    for (const conversation of conversations) {
      io.to(`conversation:${conversation.id}`).emit('user_online', { userId });
    }
  });

  eventEmitter.on('presence:user_offline', async ({ userId }) => {
    const conversations =
      await conversationRepository.findConversationsByUserId(userId);

    for (const conversation of conversations) {
      io.to(`conversation:${conversation.id}`).emit('user_offline', { userId });
    }
  });
}
