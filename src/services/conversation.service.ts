import type {
  AddConversationParticipantInput,
  CreateDirectConversationInput,
  CreateGroupConversationInput,
} from '../schemas/conversation.schema.js';
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

export async function createGroupConversation(
  currentUserId: string,
  userInput: CreateGroupConversationInput,
) {
  const participantIds = [
    currentUserId,
    ...userInput.participantIds.filter((id) => currentUserId !== id),
  ];

  const users = await userRepository.findUsersByIds(participantIds);

  if (users.length !== participantIds.length) {
    throw new ApiError(404, 'One or more users not found');
  }

  return conversationRepository.createGroupConversation(
    userInput.name,
    participantIds,
  );
}

export async function addConversationParticipants(
  conversationId: string,
  userId: string,
  userInput: AddConversationParticipantInput,
) {
  const conversation = await conversationRepository.findUserConversationById(
    conversationId,
    userId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (conversation.type !== 'GROUP') {
    throw new ApiError(
      400,
      'Participants can only be added to group conversations',
    );
  }

  const users = await userRepository.findUsersByIds(userInput.userIds);

  if (users.length !== userInput.userIds.length) {
    throw new ApiError(404, 'One or more users not found');
  }

  const existingParticipants =
    await conversationRepository.findConversationParticipantsByUserIds(
      conversationId,
      userInput.userIds,
    );

  if (existingParticipants.length > 0) {
    throw new ApiError(409, 'One or more users are already participants');
  }

  return conversationRepository.addGroupConversationParticipants(
    conversationId,
    userInput.userIds,
  );
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

export async function validateAndGetConversation(
  conversationId: string | undefined,
  userId: string,
) {
  if (!conversationId) {
    throw new Error('Converastion ID is required');
  }

  const conversation = await conversationRepository.findUserConversationById(
    conversationId,
    userId,
  );

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return conversation;
}
