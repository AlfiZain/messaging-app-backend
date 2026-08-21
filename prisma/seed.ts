import { prisma } from '../src/lib/prisma.ts';

async function main() {
  await prisma.user.create({
    data: {
      username: 'alice',
      email: 'alice@example.com',
      password: 'password',
      displayName: 'Alice',
    },
  });

  await prisma.user.create({
    data: {
      username: 'bob',
      email: 'bob@example.com',
      password: 'password',
      displayName: 'Bob',
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
