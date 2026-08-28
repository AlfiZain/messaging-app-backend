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
