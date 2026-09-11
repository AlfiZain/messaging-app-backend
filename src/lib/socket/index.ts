import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../../configs/env.js';
import { authenticateSocket } from './auth.js';
import { registerConversationHandlers } from './conversation.handler.js';
import { registerMessageHandlers } from './message.handler.js';
import { registerEventHandler } from './event.handler.js';

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
    },
  });

  registerEventHandler(io);

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerConversationHandlers(socket);
    registerMessageHandlers(socket);
  });

  return io;
}
