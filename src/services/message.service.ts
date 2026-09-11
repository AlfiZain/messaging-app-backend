import { eventEmitter } from '../configs/event-emitter.js';
import * as conversationRepository from '../repositories/conversation.repository.js';
import * as messageRepository from '../repositories/message.repository.js';
import type { createMessageInput } from '../schemas/message.schema.js';
import { ApiError } from '../utils/api-error.js';

export async function createMessage(
  conversationId: string,
  senderId: string,
  userInput: createMessageInput,
) {
  const conversation = await conversationRepository.findUserConversationById(
    conversationId,
    senderId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  const message = await messageRepository.createMessage(
    conversationId,
    senderId,
    userInput.content,
  );

  eventEmitter.emit('message:created', message);

  return message;
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
) {
  const conversation = await conversationRepository.findUserConversationById(
    conversationId,
    userId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  return messageRepository.findMessagesByConversationId(conversationId);
}
