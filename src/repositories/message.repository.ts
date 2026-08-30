import { prisma } from '../lib/prisma.js';

export async function createMessage(
  conversationId: string,
  senderId: string,
  content: string,
) {
  return prisma.message.create({
    data: {
      content,
      senderId,
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
