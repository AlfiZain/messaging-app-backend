import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../../configs/env.js';
import { authenticateSocket } from './auth.js';
import { registerConversationHandlers } from './conversation.handler.js';
import { registerMessageHandlers } from './message.handler.js';
import { registerEventHandler } from './event.handler.js';
import { addUserSocket, removeUserSocket } from './presence.js';
import { eventEmitter } from '../../configs/event-emitter.js';

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
    },
  });

  registerEventHandler(io);

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    const becameOnline = addUserSocket(userId, socket.id);

    if (becameOnline) {
      eventEmitter.emit('presence:user_online', { userId });
    }

    registerConversationHandlers(socket);
    registerMessageHandlers(socket);

    socket.on('disconnect', () => {
      const becameOffline = removeUserSocket(userId, socket.id);

      if (becameOffline) {
        eventEmitter.emit('presence:user_offline', { userId });
      }
    });
  });

  return io;
}
