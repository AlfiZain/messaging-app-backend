import { prisma } from '../lib/prisma.js';

export async function upsertDirectConversation(
  directKey: string,
  userIds: [string, string],
) {
  return prisma.conversation.upsert({
    where: {
      directKey,
    },
    create: {
      directKey,
      participants: {
        createMany: {
          data: userIds.map((userId) => ({ userId })),
        },
      },
    },
    update: {},
    include: {
      participants: {
        select: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

export async function createGroupConversation(
  name: string,
  participantIds: string[],
) {
  return prisma.conversation.create({
    data: {
      name,
      type: 'GROUP',
      participants: {
        createMany: {
          data: participantIds.map((userId) => ({ userId })),
        },
      },
    },
    include: {
      participants: {
        select: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

export async function addGroupConversationParticipants(
  conversationId: string,
  userIds: string[],
) {
  return prisma.conversationParticipant.createManyAndReturn({
    data: userIds.map((userId) => ({
      conversationId,
      userId,
    })),
    select: {
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });
}

export async function findConversationsByUserId(userId: string) {
  return prisma.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },
    include: {
      participants: {
        select: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}

export async function findUserConversationById(
  conversationId: string,
  userId: string,
) {
  return prisma.conversation.findUnique({
    where: {
      id: conversationId,
      participants: {
        some: {
          userId,
        },
      },
    },
    include: {
      participants: {
        select: {
          user: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

export async function findConversationParticipantsByUserIds(
  conversationId: string,
  userIds: string[],
) {
  return prisma.conversationParticipant.findMany({
    where: {
      conversationId,
      userId: {
        in: userIds,
      },
    },
    select: {
      userId: true,
    },
  });
}
