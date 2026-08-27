import { prisma } from '../lib/prisma.js';

export async function findByUsernameOrEmail(username: string, email: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  });
}

export async function createUser(userData: {
  username: string;
  email: string;
  password: string;
  displayName: string;
}) {
  return prisma.user.create({
    data: userData,
    omit: {
      password: true,
    },
  });
}

export async function updateUserProfile(
  userId: string,
  userData: {
    displayName: string;
    bio?: string | null;
    avatarUrl?: string | null;
  },
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: userData,
    omit: {
      password: true,
    },
  });
}

export async function changeUserPassword(userId: string, password: string) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password,
    },
    omit: {
      password: true,
    },
  });
}
