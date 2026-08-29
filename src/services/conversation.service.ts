import type { CreateDirectConversationInput } from '../schemas/conversation.schema.js';
import { ApiError } from '../utils/api-error.js';
import * as userRepository from '../repositories/user.repository.js';
import * as conversationRepository from '../repositories/conversation.repository.js';

export async function createDirectConversation(
  currentUserId: string,
  userInput: CreateDirectConversationInput,
) {
  if (currentUserId === userInput.userId) {
    throw new ApiError(400, 'Cannot create a conversation with yourself');
  }

  const targetUser = await userRepository.findUserById(userInput.userId);

  if (!targetUser) {
    throw new ApiError(404, 'User not found');
  }

  const userIds = [currentUserId, userInput.userId].sort() as [string, string];
  const directKey = userIds.join(':');

  return conversationRepository.upsertDirectConversation(directKey, userIds);
}

export async function getUserConversations(userId: string) {
  return conversationRepository.findConversationsByUserId(userId);
}

export async function getDetailUserConversation(
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

  return conversation;
}
