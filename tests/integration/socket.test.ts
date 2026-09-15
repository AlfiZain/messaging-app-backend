import { createServer } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import request from 'supertest';

import app from '../../src/app.js';
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

  const response = await request(app)
    .post('/api/auth/register')
    .send(userData)
    .expect(201);

  return {
    token: response.body.data.token,
    user: response.body.data.user,
  };
};

const createSocket = (port: number, token: string) => {
  return createClient(`http://localhost:${port}`, {
    auth: {
      token,
    },
  });
};

const waitForSocketEvent = <T>(socket: Socket, event: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const handleEvent = (data: T) => {
      socket.off(event, handleEvent);
      socket.off('connect_error', handleError);
      resolve(data);
    };

    const handleError = (error: Error) => {
      socket.off(event, handleEvent);
      socket.off('connect_error', handleError);
      reject(error);
    };

    socket.once(event, handleEvent);
    socket.once('connect_error', handleError);
  });
};

const connectSocket = async (socket: Socket) => {
  if (socket.connected) {
    return;
  }

  await waitForSocketEvent<void>(socket, 'connect');
};

const expectNoSocketEvent = (
  socket: Socket,
  event: string,
  timeout = 100,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const handleEvent = () => {
      clearTimeout(timer);
      socket.off(event, handleEvent);

      reject(
        new Error(`Expected "${event}" not to be emitted within ${timeout}ms`),
      );
    };

    const timer = setTimeout(() => {
      socket.off(event, handleEvent);
      resolve();
    }, timeout);

    socket.once(event, handleEvent);
  });
};

const disconnectSockets = (...sockets: Socket[]) => {
  for (const socket of sockets) {
    socket.disconnect();
  }
};

const createDirectConversation = async (token: string, userId: string) => {
  const response = await request(app)
    .post('/api/conversations/direct')
    .set('Authorization', `Bearer ${token}`)
    .send({ userId })
    .expect(201);

  return response.body.data.conversation;
};

const createGroupConversation = async (
  token: string,
  participantIds: string[],
) => {
  const response = await request(app)
    .post('/api/conversations/group')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Test Group',
      participantIds,
    })
    .expect(201);

  return response.body.data.conversation;
};

const joinConversation = async (socket: Socket, conversationId: string) => {
  socket.emit('join_conversation', {
    conversationId,
  });

  await waitForSocketEvent(socket, 'conversation_joined');
};

describe('Socket.IO', () => {
  let httpServer: ReturnType<typeof createServer>;
  let port: number;

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

  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
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

  describe('authentication', () => {
    it('accepts a connection with valid access token', async () => {
      const user = await registerUser();
      const socket = createSocket(port, user.token);

      await connectSocket(socket);

      expect(socket.connected).toBe(true);

      socket.disconnect();
    });

    it('rejects a connection without access token', async () => {
      const socket = createSocket(port, '');

      const error = await waitForSocketEvent<Error>(socket, 'connect_error');

      expect(error.message).toBe('Authentication required');

      socket.disconnect();
    });

    it('rejects a connection with an invalid access token', async () => {
      const socket = createSocket(port, 'invalid-token');

      const error = await waitForSocketEvent<Error>(socket, 'connect_error');

      expect(error.message).toBe('Invalid token');

      socket.disconnect();
    });
  });

  describe('conversation rooms', () => {
    it('allows a conversation participant to join the conversation room and receive presence snapshot', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socket = createSocket(port, userA.token);

      await connectSocket(socket);

      socket.emit('join_conversation', {
        conversationId: conversation.id,
      });

      const event = await waitForSocketEvent<{
        conversationId: string;
        onlineUserIds: string[];
      }>(socket, 'conversation_joined');

      expect(event).toEqual({
        conversationId: conversation.id,
        onlineUserIds: [userA.user.id],
      });

      socket.disconnect();
    });

    it('rejects a non-participant from joining a conversation room', async () => {
      const userA = await registerUser();
      const userB = await registerUser();
      const userC = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socket = createSocket(port, userC.token);

      await connectSocket(socket);

      socket.emit('join_conversation', {
        conversationId: conversation.id,
      });

      const error = await waitForSocketEvent<{
        message: string;
      }>(socket, 'conversation_error');

      expect(error).toEqual({
        message: 'Conversation not found',
      });

      socket.disconnect();
    });

    it('rejects joining a conversation that does not exist', async () => {
      const user = await registerUser();

      const socket = createSocket(port, user.token);

      await connectSocket(socket);

      socket.emit('join_conversation', {
        conversationId: '01999999-9999-7999-8999-999999999999',
      });

      const error = await waitForSocketEvent<{
        message: string;
      }>(socket, 'conversation_error');

      expect(error).toEqual({
        message: 'Conversation not found',
      });

      socket.disconnect();
    });

    it('rejects an invalid conversation ID', async () => {
      const user = await registerUser();

      const socket = createSocket(port, user.token);

      await connectSocket(socket);

      socket.emit('join_conversation', {
        conversationId: 'invalid-uuid',
      });

      const error = await waitForSocketEvent<{
        message: string;
        errors: Array<{
          field: string;
          message: string;
        }>;
      }>(socket, 'conversation_error');

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
    });
  });

  describe('messages', () => {
    it('allows a participant to send a message', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socket = createSocket(port, userA.token);

      await connectSocket(socket);
      await joinConversation(socket, conversation.id);

      const messagePromise = waitForSocketEvent<{
        message: {
          content: string;
          conversationId: string;
          sender: {
            id: string;
          };
        };
      }>(socket, 'new_message');

      socket.emit('send_message', {
        conversationId: conversation.id,
        content: 'Hello from Socket.IO',
      });

      const data = await messagePromise;

      expect(data.message.content).toBe('Hello from Socket.IO');
      expect(data.message.conversationId).toBe(conversation.id);
      expect(data.message.sender.id).toBe(userA.user.id);

      const message = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          content: 'Hello from Socket.IO',
        },
      });

      expect(message).not.toBeNull();
      expect(message?.senderId).toBe(userA.user.id);

      socket.disconnect();
    });

    it('delivers a message to another participant in the conversation', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socketA = createSocket(port, userA.token);
      const socketB = createSocket(port, userB.token);

      await Promise.all([connectSocket(socketA), connectSocket(socketB)]);

      await Promise.all([
        joinConversation(socketA, conversation.id),
        joinConversation(socketB, conversation.id),
      ]);

      const messagePromise = waitForSocketEvent<{
        message: {
          content: string;
          conversationId: string;
          sender: {
            id: string;
          };
        };
      }>(socketB, 'new_message');

      socketA.emit('send_message', {
        conversationId: conversation.id,
        content: 'Hello User B',
      });

      const data = await messagePromise;

      expect(data.message.content).toBe('Hello User B');
      expect(data.message.sender.id).toBe(userA.user.id);
      expect(data.message.conversationId).toBe(conversation.id);

      disconnectSockets(socketA, socketB);
    });

    it('delivers a new message event when a message is created through REST', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socketB = createSocket(port, userB.token);

      await connectSocket(socketB);
      await joinConversation(socketB, conversation.id);

      const messagePromise = waitForSocketEvent<{
        message: {
          content: string;
          conversationId: string;
          sender: {
            id: string;
          };
        };
      }>(socketB, 'new_message');

      await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          content: 'Hello from REST',
        })
        .expect(201);

      const data = await messagePromise;

      expect(data.message.content).toBe('Hello from REST');
      expect(data.message.conversationId).toBe(conversation.id);
      expect(data.message.sender.id).toBe(userA.user.id);

      socketB.disconnect();
    });

    it('rejects a message from a non-participant', async () => {
      const userA = await registerUser();
      const userB = await registerUser();
      const userC = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socket = createSocket(port, userC.token);

      await connectSocket(socket);

      const errorPromise = waitForSocketEvent<{
        message: string;
      }>(socket, 'message_error');

      socket.emit('send_message', {
        conversationId: conversation.id,
        content: 'Unauthorized message',
      });

      const error = await errorPromise;

      expect(error).toEqual({
        message: 'Conversation not found',
      });

      const message = await prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          content: 'Unauthorized message',
        },
      });

      expect(message).toBeNull();

      socket.disconnect();
    });

    it('rejects an invalid send_message payload', async () => {
      const user = await registerUser();

      const socket = createSocket(port, user.token);

      await connectSocket(socket);

      const errorPromise = waitForSocketEvent<{
        message: string;
        errors: Array<{
          field: string;
          message: string;
        }>;
      }>(socket, 'message_error');

      socket.emit('send_message', {
        conversationId: 'invalid-uuid',
        content: '',
      });

      const error = await errorPromise;

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
    });
  });

  describe('messages status', () => {
    it('delivers message_delivered event to all sender sockets', async () => {
      const sender = await registerUser();
      const recipient = await registerUser();

      const conversation = await createDirectConversation(
        sender.token,
        recipient.user.id,
      );

      const messageResponse = await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${sender.token}`)
        .send({
          content: 'Hello from multi-device',
        })
        .expect(201);

      const messageId = messageResponse.body.data.message.id;

      const senderSocket1 = createSocket(port, sender.token);
      const senderSocket2 = createSocket(port, sender.token);
      const recipientSocket = createSocket(port, recipient.token);

      await Promise.all([
        connectSocket(senderSocket1),
        connectSocket(senderSocket2),
        connectSocket(recipientSocket),
      ]);

      const deliveredPromise1 = waitForSocketEvent<{
        messageId: string;
        conversationId: string;
        deliveredAt: string;
      }>(senderSocket1, 'message_delivered');

      const deliveredPromise2 = waitForSocketEvent<{
        messageId: string;
        conversationId: string;
        deliveredAt: string;
      }>(senderSocket2, 'message_delivered');

      recipientSocket.emit('mark_message_delivered', {
        messageId,
        conversationId: conversation.id,
      });

      const [event1, event2] = await Promise.all([
        deliveredPromise1,
        deliveredPromise2,
      ]);

      expect(event1).toEqual({
        messageId,
        conversationId: conversation.id,
        userId: recipient.user.id,
        deliveredAt: expect.any(String),
      });

      expect(event2).toEqual({
        messageId,
        conversationId: conversation.id,
        userId: recipient.user.id,
        deliveredAt: expect.any(String),
      });

      expect(event1.deliveredAt).toBe(event2.deliveredAt);

      disconnectSockets(senderSocket1, senderSocket2, recipientSocket);
    });

    it('delivers message_read event to all sender sockets', async () => {
      const sender = await registerUser();
      const recipient = await registerUser();

      const conversation = await createDirectConversation(
        sender.token,
        recipient.user.id,
      );

      const messageResponse = await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${sender.token}`)
        .send({
          content: 'Hello from multi-device',
        })
        .expect(201);

      const messageId = messageResponse.body.data.message.id;

      const senderSocket1 = createSocket(port, sender.token);
      const senderSocket2 = createSocket(port, sender.token);
      const recipientSocket = createSocket(port, recipient.token);

      await Promise.all([
        connectSocket(senderSocket1),
        connectSocket(senderSocket2),
        connectSocket(recipientSocket),
      ]);

      const deliveredPromise = waitForSocketEvent<{
        messageId: string;
      }>(senderSocket1, 'message_delivered');

      recipientSocket.emit('mark_message_delivered', {
        messageId,
        conversationId: conversation.id,
      });

      await deliveredPromise;

      const readPromise1 = waitForSocketEvent<{
        messageId: string;
        conversationId: string;
        readAt: string;
      }>(senderSocket1, 'message_read');

      const readPromise2 = waitForSocketEvent<{
        messageId: string;
        conversationId: string;
        readAt: string;
      }>(senderSocket2, 'message_read');

      recipientSocket.emit('mark_message_read', {
        messageId,
        conversationId: conversation.id,
      });

      const [event1, event2] = await Promise.all([readPromise1, readPromise2]);

      expect(event1).toEqual({
        messageId,
        conversationId: conversation.id,
        userId: recipient.user.id,
        readAt: expect.any(String),
      });

      expect(event2).toEqual({
        messageId,
        conversationId: conversation.id,
        userId: recipient.user.id,
        readAt: expect.any(String),
      });

      expect(event1.readAt).toBe(event2.readAt);

      disconnectSockets(senderSocket1, senderSocket2, recipientSocket);
    });
  });

  describe('presence', () => {
    it('tracks presence correctly across multiple active sockets', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socketB = createSocket(port, userB.token);

      await connectSocket(socketB);
      await joinConversation(socketB, conversation.id);

      const socketA1 = createSocket(port, userA.token);

      const onlinePromise = waitForSocketEvent<{
        userId: string;
      }>(socketB, 'user_online');

      await connectSocket(socketA1);

      const onlineEvent = await onlinePromise;

      expect(onlineEvent).toEqual({
        userId: userA.user.id,
      });

      const socketA2 = createSocket(port, userA.token);

      await connectSocket(socketA2);

      socketA1.disconnect();

      await expectNoSocketEvent(socketB, 'user_offline');

      const offlinePromise = waitForSocketEvent<{
        userId: string;
      }>(socketB, 'user_offline');

      socketA2.disconnect();

      const offlineEvent = await offlinePromise;

      expect(offlineEvent).toEqual({
        userId: userA.user.id,
      });

      socketB.disconnect();
    });

    it('emits user_online again when the user reconnects after going offline', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createDirectConversation(
        userA.token,
        userB.user.id,
      );

      const socketB = createSocket(port, userB.token);

      await connectSocket(socketB);
      await joinConversation(socketB, conversation.id);

      const socketA1 = createSocket(port, userA.token);

      const firstOnlinePromise = waitForSocketEvent<{
        userId: string;
      }>(socketB, 'user_online');

      await connectSocket(socketA1);

      await firstOnlinePromise;

      const offlinePromise = waitForSocketEvent<{
        userId: string;
      }>(socketB, 'user_offline');

      socketA1.disconnect();

      await offlinePromise;

      const socketA2 = createSocket(port, userA.token);

      const reconnectOnlinePromise = waitForSocketEvent<{
        userId: string;
      }>(socketB, 'user_online');

      await connectSocket(socketA2);

      const onlineEvent = await reconnectOnlinePromise;

      expect(onlineEvent).toEqual({
        userId: userA.user.id,
      });

      disconnectSockets(socketA2, socketB);
    });
  });

  describe('group events', () => {
    it('notifies conversation participants when a participant is added', async () => {
      const userA = await registerUser();
      const userB = await registerUser();
      const userC = await registerUser();

      const conversation = await createGroupConversation(userA.token, [
        userB.user.id,
      ]);

      const socketA = createSocket(port, userA.token);
      const socketB = createSocket(port, userB.token);
      const socketC = createSocket(port, userC.token);

      await Promise.all([
        connectSocket(socketA),
        connectSocket(socketB),
        connectSocket(socketC),
      ]);

      await Promise.all([
        joinConversation(socketA, conversation.id),
        joinConversation(socketB, conversation.id),
      ]);

      const participantAddedPromiseA = waitForSocketEvent<{
        conversationId: string;
        participants: Array<{
          user: {
            id: string;
          };
        }>;
        onlineUserIds: string[];
      }>(socketA, 'participant_added');

      const participantAddedPromiseB = waitForSocketEvent<{
        conversationId: string;
        participants: Array<{
          user: {
            id: string;
          };
        }>;
        onlineUserIds: string[];
      }>(socketB, 'participant_added');

      const conversationAddedPromise = waitForSocketEvent<{
        conversation: {
          id: string;
          type: string;
          name: string;
        };
        onlineUserIds: string[];
      }>(socketC, 'conversation_added');

      await request(app)
        .post(`/api/conversations/${conversation.id}/participants`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          userIds: [userC.user.id],
        })
        .expect(200);

      const [eventA, eventB, eventC] = await Promise.all([
        participantAddedPromiseA,
        participantAddedPromiseB,
        conversationAddedPromise,
      ]);

      expect(eventA).toEqual({
        conversationId: conversation.id,
        participants: [
          expect.objectContaining({
            user: expect.objectContaining({
              id: userC.user.id,
            }),
          }),
        ],
        onlineUserIds: expect.arrayContaining([
          userA.user.id,
          userB.user.id,
          userC.user.id,
        ]),
      });

      expect(eventB).toEqual({
        conversationId: conversation.id,
        participants: [
          expect.objectContaining({
            user: expect.objectContaining({
              id: userC.user.id,
            }),
          }),
        ],
        onlineUserIds: expect.arrayContaining([
          userA.user.id,
          userB.user.id,
          userC.user.id,
        ]),
      });

      expect(eventC).toEqual({
        conversation: expect.objectContaining({
          id: conversation.id,
          type: 'GROUP',
          name: 'Test Group',
        }),
        onlineUserIds: expect.arrayContaining([
          userA.user.id,
          userB.user.id,
          userC.user.id,
        ]),
      });

      disconnectSockets(socketA, socketB, socketC);
    });

    it('notifies all sockets of the added user about the new conversation', async () => {
      const userA = await registerUser();
      const userB = await registerUser();
      const userC = await registerUser();

      const conversation = await createGroupConversation(userA.token, [
        userB.user.id,
      ]);

      const socketC1 = createSocket(port, userC.token);
      const socketC2 = createSocket(port, userC.token);

      await Promise.all([connectSocket(socketC1), connectSocket(socketC2)]);

      const conversationAddedPromise1 = waitForSocketEvent<{
        conversation: {
          id: string;
        };
        onlineUserIds: string[];
      }>(socketC1, 'conversation_added');

      const conversationAddedPromise2 = waitForSocketEvent<{
        conversation: {
          id: string;
        };
        onlineUserIds: string[];
      }>(socketC2, 'conversation_added');

      await request(app)
        .post(`/api/conversations/${conversation.id}/participants`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          userIds: [userC.user.id],
        })
        .expect(200);

      const [event1, event2] = await Promise.all([
        conversationAddedPromise1,
        conversationAddedPromise2,
      ]);

      expect(event1).toEqual({
        conversation: expect.objectContaining({
          id: conversation.id,
        }),
        onlineUserIds: expect.arrayContaining([userC.user.id]),
      });

      expect(event2).toEqual({
        conversation: expect.objectContaining({
          id: conversation.id,
        }),
        onlineUserIds: expect.arrayContaining([userC.user.id]),
      });

      disconnectSockets(socketC1, socketC2);
    });

    it('notifies conversation participants when a participant leaves', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createGroupConversation(userA.token, [
        userB.user.id,
      ]);

      const socketA = createSocket(port, userA.token);
      const socketB = createSocket(port, userB.token);

      await Promise.all([connectSocket(socketA), connectSocket(socketB)]);

      await Promise.all([
        joinConversation(socketA, conversation.id),
        joinConversation(socketB, conversation.id),
      ]);

      const participantLeftPromise = waitForSocketEvent<{
        conversationId: string;
        userId: string;
      }>(socketA, 'participant_left');

      await request(app)
        .delete(`/api/conversations/${conversation.id}/participants/me`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      const event = await participantLeftPromise;

      expect(event).toEqual({
        conversationId: conversation.id,
        userId: userB.user.id,
      });

      disconnectSockets(socketA, socketB);
    });

    it('notifies all sockets of the leaving user that the conversation was removed', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createGroupConversation(userA.token, [
        userB.user.id,
      ]);

      const socketB1 = createSocket(port, userB.token);
      const socketB2 = createSocket(port, userB.token);

      await Promise.all([connectSocket(socketB1), connectSocket(socketB2)]);

      await Promise.all([
        joinConversation(socketB1, conversation.id),
        joinConversation(socketB2, conversation.id),
      ]);

      const removedPromise1 = waitForSocketEvent<{
        conversationId: string;
      }>(socketB1, 'conversation_removed');

      const removedPromise2 = waitForSocketEvent<{
        conversationId: string;
      }>(socketB2, 'conversation_removed');

      await request(app)
        .delete(`/api/conversations/${conversation.id}/participants/me`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      const [event1, event2] = await Promise.all([
        removedPromise1,
        removedPromise2,
      ]);

      expect(event1).toEqual({
        conversationId: conversation.id,
      });

      expect(event2).toEqual({
        conversationId: conversation.id,
      });

      disconnectSockets(socketB1, socketB2);
    });

    it('allows a group participant to send a message to another group participant', async () => {
      const userA = await registerUser();
      const userB = await registerUser();

      const conversation = await createGroupConversation(userA.token, [
        userB.user.id,
      ]);

      const socketA = createSocket(port, userA.token);
      const socketB = createSocket(port, userB.token);

      await Promise.all([connectSocket(socketA), connectSocket(socketB)]);

      await Promise.all([
        joinConversation(socketA, conversation.id),
        joinConversation(socketB, conversation.id),
      ]);

      const messagePromise = waitForSocketEvent<{
        message: {
          content: string;
          conversationId: string;
          sender: {
            id: string;
          };
        };
      }>(socketB, 'new_message');

      socketA.emit('send_message', {
        conversationId: conversation.id,
        content: 'Hello Group',
      });

      const event = await messagePromise;

      expect(event.message).toEqual(
        expect.objectContaining({
          content: 'Hello Group',
          conversationId: conversation.id,
          sender: expect.objectContaining({
            id: userA.user.id,
          }),
        }),
      );

      disconnectSockets(socketA, socketB);
    });
  });
});
