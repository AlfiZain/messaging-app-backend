import type { Server } from 'socket.io';
import { eventEmitter } from '../../configs/event-emitter.js';

export function registerEventHandler(io: Server) {
  eventEmitter.on('message:created', (message) => {
    const room = `conversation:${message.conversationId}`;

    io.to(room).emit('new_message', { message });
  });

  eventEmitter.on(
    'conversation:participants_added',
    ({ conversation, addedParticipants }) => {
      const room = `conversation:${conversation.id}`;

      io.to(room).emit('participant_added', {
        conversationId: conversation.id,
        participants: addedParticipants,
      });

      for (const participant of addedParticipants) {
        io.to(`user:${participant.user.id}`).emit('conversation_added', {
          conversation,
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
}
