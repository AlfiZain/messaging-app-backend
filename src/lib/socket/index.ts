import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../../configs/env.js';
import { authenticateSocket } from './auth.js';
import { registerConversationHandlers } from './conversation.handler.js';
import { registerMessageHandlers } from './message.handler.js';

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerConversationHandlers(socket);
    registerMessageHandlers(io, socket);
  });

  return io;
}
