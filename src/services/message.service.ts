import { eventEmitter } from '../configs/event-emitter.js';
import {
  deleteImageFromCloudinary,
  uploadImageToCloudinary,
} from '../lib/cloudinary.js';
import * as conversationRepository from '../repositories/conversation.repository.js';
import * as messageRepository from '../repositories/message.repository.js';
import type { createMessageInput } from '../schemas/message.schema.js';
import { ApiError } from '../utils/api-error.js';

export async function createMessage(
  conversationId: string,
  senderId: string,
  userInput: createMessageInput,
  file?: Express.Multer.File,
) {
  const conversation = await conversationRepository.findUserConversationById(
    conversationId,
    senderId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (!userInput.content && !file) {
    throw new ApiError(400, 'Message content or image is required');
  }

  let imageUrl: string | null = null;
  let imagePublicId: string | undefined;

  try {
    if (file) {
      const uploadedImage = await uploadImageToCloudinary(file.buffer, {
        folder: 'messaging-app/messages',
      });

      imageUrl = uploadedImage.secure_url;
      imagePublicId = uploadedImage.public_id;
    }

    const message = await messageRepository.createMessage(
      conversationId,
      senderId,
      userInput.content,
      imageUrl,
    );

    eventEmitter.emit('message:created', message);

    return message;
  } catch (error) {
    if (imagePublicId) {
      try {
        await deleteImageFromCloudinary(imagePublicId);
      } catch (cleanupError) {
        console.error(
          'Failed to cleanup uploaded message image:',
          cleanupError,
        );
      }
    }

    throw error;
  }
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

export async function markMessageAsDelivered(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  const message = await messageRepository.findMessageById(messageId);

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.senderId === userId) {
    throw new ApiError(
      403,
      'Sender cannot mark their own message as delivered',
    );
  }

  if (message.conversationId !== conversationId) {
    throw new ApiError(404, 'Message not found');
  }

  const conversation = await conversationRepository.findUserConversationById(
    message.conversationId,
    userId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (message.deliveredAt) {
    return message;
  }

  const updatedMessage =
    await messageRepository.markMessageAsDelivered(messageId);

  eventEmitter.emit('message:delivered', {
    messageId: updatedMessage.id,
    conversationId: updatedMessage.conversationId,
    senderId: updatedMessage.senderId,
    userId,
    timestamp: updatedMessage.deliveredAt!,
  });

  return updatedMessage;
}

export async function markMessageAsRead(
  conversationId: string,
  messageId: string,
  userId: string,
) {
  const message = await messageRepository.findMessageById(messageId);

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.senderId === userId) {
    throw new ApiError(403, 'Sender cannot mark their own message as read');
  }

  if (message.conversationId !== conversationId) {
    throw new ApiError(404, 'Message not found');
  }

  const conversation = await conversationRepository.findUserConversationById(
    message.conversationId,
    userId,
  );

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  if (!message.deliveredAt) {
    throw new ApiError(
      400,
      'Message must be delivered before it can be marked as read',
    );
  }

  if (message.readAt) {
    return message;
  }

  const updatedMessage = await messageRepository.markMessageAsRead(messageId);

  eventEmitter.emit('message:read', {
    messageId: updatedMessage.id,
    conversationId: updatedMessage.conversationId,
    senderId: updatedMessage.senderId,
    userId,
    timestamp: updatedMessage.readAt!,
  });

  return updatedMessage;
}
