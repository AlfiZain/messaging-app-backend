import { createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient } from 'socket.io-client';
import request from 'supertest';

import app from '../../src/app.js';
import { generateAccessToken } from '../../src/lib/jwt.js';
import { prisma } from '../../src/lib/prisma.js';
import { initSocketServer } from '../../src/lib/socket/index.js';

const createUniqueUserData = () => {
  const uuid = crypto.randomUUID().slice(0, 8);

  return {
    username: `user_${uuid}`,
    email: `user_${uuid}@example.com`,
    password: 'Password123#',
    displayName: `User ${uuid}`,
  };
};

const registerUser = async () => {
  const userData = createUniqueUserData();

  const response = await request(app).post('/api/auth/register').send(userData);

  return {
    token: response.body.data.token,
    user: response.body.data.user,
  };
};

describe('Socket.IO authentication', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  beforeAll(async () => {
    httpServer = createServer(app);
    initSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();

        if (typeof address === 'object' && address) {
          port = address.port;
        }

        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('accepts a connection with valid access token', async () => {
    const token = generateAccessToken('test-user-id');

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', reject);
    });
  });

  it('rejects a connection without access token', async () => {
    const socket = createClient(`http://localhost:${port}`);

    await new Promise<void>((resolve) => {
      socket.on('connect_error', (error) => {
        expect(error.message).toBe('Authentication required');
        socket.disconnect();
        resolve();
      });
    });
  });

  it('rejects a connection with an invalid access token', async () => {
    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: 'invalid-token',
      },
    });

    await new Promise<void>((resolve) => {
      socket.on('connect_error', (error) => {
        expect(error.message).toBe('Invalid token');
        socket.disconnect();
        resolve();
      });
    });
  });

  it('allows a conversation participant to join the conversation room', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversationResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    const conversationId = conversationResponse.body.data.conversation.id;

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: user.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('join_conversation', {
          conversationId,
        });
      });

      socket.on('conversation_joined', (data) => {
        expect(data).toEqual({
          conversationId,
        });

        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', reject);

      socket.on('conversation_error', (error) => {
        reject(new Error(error.message));
      });
    });
  });

  it('rejects a non-participant from joining a conversation room', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();
    const otherUser = await registerUser();

    const conversationResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    const conversationId = conversationResponse.body.data.conversation.id;

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: otherUser.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('join_conversation', {
          conversationId,
        });
      });

      socket.on('conversation_error', (error) => {
        expect(error).toEqual({
          message: 'Conversation not found',
        });

        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', reject);
    });
  });

  it('rejects joining a conversation that does not exist', async () => {
    const user = await registerUser();

    const conversationId = '01999999-9999-7999-8999-999999999999';

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: user.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('join_conversation', {
          conversationId,
        });
      });

      socket.on('conversation_error', (error) => {
        expect(error).toEqual({
          message: 'Conversation not found',
        });

        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', reject);
    });
  });

  it('rejects an invalid conversation ID', async () => {
    const user = await registerUser();

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: user.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('join_conversation', {
          conversationId: 'invalid-uuid',
        });
      });

      socket.on('conversation_error', (error) => {
        expect(error).toEqual({
          message: 'Validation failed',
          errors: [
            {
              field: 'conversationId',
              message: 'Conversation ID must be a valid UUID',
            },
          ],
        });

        socket.disconnect();
        resolve();
      });

      socket.on('connect_error', reject);
    });
  });

  it('allows a participant to send a message', async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    const conversationResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ userId: userB.user.id })
      .expect(201);

    const conversationId = conversationResponse.body.data.conversation.id;

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: userA.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('join_conversation', {
          conversationId,
        });
      });

      socket.on('conversation_joined', () => {
        socket.emit('send_message', {
          conversationId,
          content: 'Hello from Socket.IO',
        });
      });

      socket.on('new_message', async (data) => {
        try {
          expect(data.message.content).toBe('Hello from Socket.IO');
          expect(data.message.sender.id).toBe(userA.user.id);
          expect(data.message.conversationId).toBe(conversationId);

          const message = await prisma.message.findFirst({
            where: {
              conversationId,
              content: 'Hello from Socket.IO',
            },
          });

          expect(message).not.toBeNull();
          expect(message?.senderId).toBe(userA.user.id);

          socket.disconnect();
          resolve();
        } catch (error) {
          socket.disconnect();
          reject(error);
        }
      });

      socket.on('message_error', (error) => {
        socket.disconnect();
        reject(new Error(error.message));
      });

      socket.on('connect_error', reject);
    });
  });

  it('delivers a message to another participant in the conversation', async () => {
    const userA = await registerUser();
    const userB = await registerUser();

    const conversationResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ userId: userB.user.id })
      .expect(201);

    const conversationId = conversationResponse.body.data.conversation.id;

    const socketA = createClient(`http://localhost:${port}`, {
      auth: {
        token: userA.token,
      },
    });

    const socketB = createClient(`http://localhost:${port}`, {
      auth: {
        token: userB.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      let joinedCount = 0;

      const cleanup = () => {
        socketA.disconnect();
        socketB.disconnect();
      };

      socketA.on('connect_error', reject);
      socketB.on('connect_error', reject);

      socketA.on('connect', () => {
        socketA.emit('join_conversation', {
          conversationId,
        });
      });

      socketB.on('connect', () => {
        socketB.emit('join_conversation', {
          conversationId,
        });
      });

      const handleJoined = () => {
        joinedCount += 1;

        if (joinedCount === 2) {
          socketA.emit('send_message', {
            conversationId,
            content: 'Hello User B',
          });
        }
      };

      socketA.on('conversation_joined', handleJoined);
      socketB.on('conversation_joined', handleJoined);

      socketB.on('new_message', (data) => {
        try {
          expect(data.message.content).toBe('Hello User B');
          expect(data.message.sender.id).toBe(userA.user.id);
          expect(data.message.conversationId).toBe(conversationId);

          cleanup();
          resolve();
        } catch (error) {
          cleanup();
          reject(error);
        }
      });

      socketA.on('message_error', (error) => {
        cleanup();
        reject(new Error(error.message));
      });

      socketB.on('message_error', (error) => {
        cleanup();
        reject(new Error(error.message));
      });
    });
  });

  it('rejects a message from a non-participant', async () => {
    const userA = await registerUser();
    const userB = await registerUser();
    const userC = await registerUser();

    const conversationResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ userId: userB.user.id })
      .expect(201);

    const conversationId = conversationResponse.body.data.conversation.id;

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: userC.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('send_message', {
          conversationId,
          content: 'Unauthorized message',
        });
      });

      socket.on('message_error', async (error) => {
        try {
          expect(error).toEqual({
            message: 'Conversation not found',
          });

          const message = await prisma.message.findFirst({
            where: {
              conversationId,
              content: 'Unauthorized message',
            },
          });

          expect(message).toBeNull();

          socket.disconnect();
          resolve();
        } catch (err) {
          socket.disconnect();
          reject(err);
        }
      });

      socket.on('connect_error', reject);
    });
  });

  it('rejects an invalid send_message payload', async () => {
    const user = await registerUser();

    const socket = createClient(`http://localhost:${port}`, {
      auth: {
        token: user.token,
      },
    });

    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('send_message', {
          conversationId: 'invalid-uuid',
          content: '',
        });
      });

      socket.on('message_error', (error) => {
        try {
          expect(error).toEqual({
            message: 'Validation failed',
            errors: expect.arrayContaining([
              {
                field: 'conversationId',
                message: 'Conversation ID must be a valid UUID',
              },
              {
                field: 'content',
                message: 'Message content is required',
              },
            ]),
          });

          socket.disconnect();
          resolve();
        } catch (err) {
          socket.disconnect();
          reject(err);
        }
      });

      socket.on('connect_error', reject);
    });
  });
});
