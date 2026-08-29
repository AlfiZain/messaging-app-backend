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

describe('POST /api/conversations/direct', () => {
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

  it('creates a direct conversation between two users', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const response = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    expect(response.status).toBe(201);

    expect(response.body).toEqual({
      success: true,
      message: 'Conversation created successfully',
      data: {
        conversation: expect.objectContaining({
          id: expect.any(String),
          directKey: expect.any(String),
          participants: expect.arrayContaining([
            {
              user: {
                id: user.user.id,
                displayName: user.user.displayName,
                avatarUrl: null,
              },
            },
            {
              user: {
                id: targetUser.user.id,
                displayName: targetUser.user.displayName,
                avatarUrl: null,
              },
            },
          ]),
        }),
      },
    });

    expect(await prisma.conversation.count()).toBe(1);
    expect(await prisma.conversationParticipant.count()).toBe(2);
  });

  it('returns the existing conversation instead of creating a duplicate', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const firstResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    const secondResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    expect(secondResponse.body.data.conversation.id).toBe(
      firstResponse.body.data.conversation.id,
    );

    expect(await prisma.conversation.count()).toBe(1);
  });

  it('returns the same conversation regardless of which user creates it', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const firstResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: targetUser.user.id,
      });

    const secondResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${targetUser.token}`)
      .send({
        userId: user.user.id,
      });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    expect(secondResponse.body.data.conversation.id).toBe(
      firstResponse.body.data.conversation.id,
    );

    expect(await prisma.conversation.count()).toBe(1);
  });

  it('rejects creating a conversation with yourself', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: user.user.id,
      });

    expect(response.status).toBe(400);

    expect(response.body).toEqual({
      success: false,
      message: 'Cannot create a conversation with yourself',
      errors: null,
    });

    expect(await prisma.conversation.count()).toBe(0);
  });

  it('returns 404 when the target user does not exist', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: '01999999-9999-7999-8999-999999999999',
      });

    expect(response.status).toBe(404);

    expect(response.body).toEqual({
      success: false,
      message: 'User not found',
      errors: null,
    });

    expect(await prisma.conversation.count()).toBe(0);
  });

  it('rejects an unauthenticated request', async () => {
    const targetUser = await registerUser();

    const response = await request(app).post('/api/conversations/direct').send({
      userId: targetUser.user.id,
    });

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: 'Authentication required',
      errors: null,
    });
  });

  it('rejects an invalid userId', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        userId: 'invalid-uuid',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('does not create duplicate conversations under concurrent requests', async () => {
    const user = await registerUser();
    const targetUser = await registerUser();

    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          userId: targetUser.user.id,
        }),

      request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          userId: targetUser.user.id,
        }),
    ]);

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    expect(firstResponse.body.data.conversation.id).toBe(
      secondResponse.body.data.conversation.id,
    );

    expect(await prisma.conversation.count()).toBe(1);
    expect(await prisma.conversationParticipant.count()).toBe(2);
  });
});

describe('GET /api/conversations', () => {
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

  it('returns conversations belonging to the authenticated user', async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const charlie = await registerUser();

    await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        userId: bob.user.id,
      });

    await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        userId: charlie.user.id,
      });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Conversations retrieved successfully');

    expect(response.body.data.conversations).toHaveLength(2);

    for (const conversation of response.body.data.conversations) {
      expect(conversation.participants).toHaveLength(2);

      expect(
        conversation.participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === alice.user.id,
        ),
      ).toBe(true);
    }
  });

  it('does not return conversations belonging to another user', async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const charlie = await registerUser();
    const david = await registerUser();

    await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        userId: bob.user.id,
      });

    await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${charlie.token}`)
      .send({
        userId: david.user.id,
      });

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.conversations).toHaveLength(1);

    const conversation = response.body.data.conversations[0];

    expect(
      conversation.participants.some(
        (participant: { user: { id: string } }) =>
          participant.user.id === bob.user.id,
      ),
    ).toBe(true);

    expect(
      conversation.participants.some(
        (participant: { user: { id: string } }) =>
          participant.user.id === charlie.user.id,
      ),
    ).toBe(false);
  });

  it('returns an empty array when the user has no conversations', async () => {
    const alice = await registerUser();

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations: [],
      },
    });
  });

  it('returns conversations ordered by updatedAt descending', async () => {
    const alice = await registerUser();
    const bob = await registerUser();
    const charlie = await registerUser();

    const firstResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        userId: bob.user.id,
      });

    const firstConversationId = firstResponse.body.data.conversation.id;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const secondResponse = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({
        userId: charlie.user.id,
      });

    const secondConversationId = secondResponse.body.data.conversation.id;

    const response = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${alice.token}`);

    expect(response.status).toBe(200);

    expect(
      response.body.data.conversations.map(
        (conversation: { id: string }) => conversation.id,
      ),
    ).toEqual([secondConversationId, firstConversationId]);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get('/api/conversations');

    expect(response.status).toBe(401);

    expect(response.body).toEqual({
      success: false,
      message: 'Authentication required',
      errors: null,
    });
  });
});
