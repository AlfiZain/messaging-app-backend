import type { Socket } from 'socket.io';
import { sendMessageEventSchema } from '../../schemas/message.schema.js';
import * as messageService from '../../services/message.service.js';

export function registerMessageHandlers(socket: Socket) {
  socket.on('send_message', async (data) => {
    const result = sendMessageEventSchema.safeParse(data);

    if (!result.success) {
      socket.emit('message_error', {
        message: 'Validation failed',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });

      return;
    }

    const { conversationId, content } = result.data;

    try {
      await messageService.createMessage(conversationId, socket.data.userId, {
        content,
      });
    } catch (error) {
      if (error instanceof Error) {
        socket.emit('message_error', {
          message: error.message,
        });

        return;
      }

      socket.emit('message_error', {
        message: 'Failed to send message',
      });
    }
  });
}
