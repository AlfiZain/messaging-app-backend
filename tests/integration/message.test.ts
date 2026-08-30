import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import crypto from 'node:crypto';

import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

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

const createDirectConversation = async (token: string, userId: string) => {
  const response = await request(app)
    .post('/api/conversations/direct')
    .set('Authorization', `Bearer ${token}`)
    .send({ userId });

  return response.body.data.conversation;
};

describe('POST /api/conversations/:conversationId/messages', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('creates a message in a conversation', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'Hello, world!',
      });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: expect.objectContaining({
          id: expect.any(String),
          conversationId: conversation.id,
          senderId: user.user.id,
          content: 'Hello, world!',
          sender: {
            id: user.user.id,
            displayName: user.user.displayName,
            avatarUrl: null,
          },
        }),
      },
    });

    expect(await prisma.message.count()).toBe(1);
  });

  it('uses the authenticated user as the sender', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'This is my message',
        senderId: targetUser.user.id,
      });

    expect(response.status).toBe(201);

    expect(response.body.data.message.senderId).toBe(user.user.id);
  });

  it('allows the other participant to send a message', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${targetUser.token}`)
      .send({
        content: 'Reply from the other user',
      });

    expect(response.status).toBe(201);

    expect(response.body.data.message.senderId).toBe(targetUser.user.id);
  });

  it('returns 404 when the conversation does not exist', async () => {
    const user = await registerUser();

    const conversationId = '01999999-9999-7999-8999-999999999999';

    const response = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'Hello',
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Conversation not found',
      errors: null,
    });
  });

  it('returns 404 when the user is not a conversation participant', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();
    const otherUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({
        content: 'Unauthorized message',
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Conversation not found',
      errors: null,
    });

    expect(await prisma.message.count()).toBe(0);
  });

  it('returns 400 when content is empty', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: '',
      });

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
    expect(await prisma.message.count()).toBe(0);
  });

  it('returns 400 when content exceeds 5000 characters', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'a'.repeat(5001),
      });

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
    expect(await prisma.message.count()).toBe(0);
  });

  it('returns 400 when conversationId is invalid', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/conversations/invalid-uuid/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'Hello',
      });

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
  });

  it('rejects an unauthenticated request', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .send({
        content: 'Hello',
      });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: 'Authentication required',
      errors: null,
    });
  });
});

describe('GET /api/conversations/:conversationId/messages', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('returns messages belonging to a conversation', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'First message',
      });

    await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${targetUser.token}`)
      .send({
        content: 'Second message',
      });

    const response = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Messages retrieved successfully');

    expect(response.body.data.messages).toHaveLength(2);

    expect(
      response.body.data.messages.map(
        (message: { content: string }) => message.content,
      ),
    ).toEqual(['First message', 'Second message']);
  });

  it('returns an empty array when the conversation has no messages', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    const response = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: [],
      },
    });
  });

  it('returns 404 when the conversation does not exist', async () => {
    const user = await registerUser();

    const conversationId = '01999999-9999-7999-8999-999999999999';

    const response = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Conversation not found',
      errors: null,
    });
  });

  it('returns 404 when the user is not a conversation participant', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();
    const otherUser = await registerUser();

    const conversation = await createDirectConversation(
      user.token,
      targetUser.user.id,
    );

    await request(app)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        content: 'Secret message',
      });

    const response = await request(app)
      .get(`/api/conversations/${conversation.id}/messages`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Conversation not found',
      errors: null,
    });
  });

  it('returns 400 when conversationId is invalid', async () => {
    const user = await registerUser();

    const response = await request(app)
      .get('/api/conversations/invalid-uuid/messages')
      .set('Authorization', `Bearer ${user.token}`);

    expect(response.status).toBe(400);

    expect(response.body.success).toBe(false);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(
      '/api/conversations/01999999-9999-7999-8999-999999999999/messages',
    );

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: 'Authentication required',
      errors: null,
    });
  });
});
