import { prisma } from '../lib/prisma.js';

export async function findByUsernameOrEmail(username: string, email: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
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
