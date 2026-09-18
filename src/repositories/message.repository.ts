import { prisma } from '../lib/prisma.js';

export async function createMessage(
  conversationId: string,
  senderId: string,
  content: string,
  imageUrl?: string | null,
) {
  return prisma.message.create({
    data: {
      content,
      senderId,
      conversationId,
      imageUrl,
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function findMessagesByConversationId(conversationId: string) {
  return prisma.message.findMany({
    where: {
      conversationId,
    },
    include: {
      sender: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function findMessageById(messageId: string) {
  return prisma.message.findUnique({
    where: {
      id: messageId,
    },
  });
}

export async function markMessageAsDelivered(messageId: string) {
  return prisma.message.update({
    where: {
      id: messageId,
    },
    data: {
      deliveredAt: new Date(),
    },
  });
}

export async function markMessageAsRead(messageId: string) {
  return prisma.message.update({
    where: {
      id: messageId,
    },
    data: {
      readAt: new Date(),
    },
  });
}
