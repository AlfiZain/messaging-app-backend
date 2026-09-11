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

describe('Conversations API', () => {
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

  describe('POST /api/conversations/direct', () => {
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

      const response = await request(app)
        .post('/api/conversations/direct')
        .send({
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

  describe('POST /api/conversations/group', () => {
    it('should create a group conversation', async () => {
      const creatorData = createUniqueUserData();
      const participantData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const participantResponse = await request(app)
        .post('/api/auth/register')
        .send(participantData);

      const creatorToken = creatorResponse.body.data.token;
      const participantId = participantResponse.body.data.user.id;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Frontend Team',
          participantIds: [participantId],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Group conversation created successfully',
      );

      const conversation = response.body.data.conversation;

      expect(conversation.type).toBe('GROUP');
      expect(conversation.name).toBe('Frontend Team');
      expect(conversation.participants).toHaveLength(2);

      expect(
        conversation.participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === creatorResponse.body.data.user.id,
        ),
      ).toBe(true);

      expect(
        conversation.participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === participantId,
        ),
      ).toBe(true);
    });

    it('should automatically add creator as a participant', async () => {
      const creatorData = createUniqueUserData();
      const participantData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const participantResponse = await request(app)
        .post('/api/auth/register')
        .send(participantData);

      const creatorToken = creatorResponse.body.data.token;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'My Group',
          participantIds: [participantResponse.body.data.user.id],
        });

      expect(response.status).toBe(201);

      const participants = response.body.data.conversation.participants;

      expect(participants).toHaveLength(2);
      expect(
        participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === creatorResponse.body.data.user.id,
        ),
      ).toBe(true);
    });

    it('should reject group creation when a participant does not exist', async () => {
      const creatorData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const creatorToken = creatorResponse.body.data.token;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Invalid Group',
          participantIds: [crypto.randomUUID()],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('One or more users not found');
    });

    it('should reject group creation without participants', async () => {
      const creatorData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const creatorToken = creatorResponse.body.data.token;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Empty Group',
          participantIds: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate participant IDs', async () => {
      const creatorData = createUniqueUserData();
      const participantData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const participantResponse = await request(app)
        .post('/api/auth/register')
        .send(participantData);

      const creatorToken = creatorResponse.body.data.token;
      const participantId = participantResponse.body.data.user.id;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Duplicate Group',
          participantIds: [participantId, participantId],
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid participant ID', async () => {
      const creatorData = createUniqueUserData();

      const creatorResponse = await request(app)
        .post('/api/auth/register')
        .send(creatorData);

      const creatorToken = creatorResponse.body.data.token;

      const response = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          name: 'Invalid Group',
          participantIds: ['invalid-uuid'],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/conversations', () => {
    it('returns direct conversations belonging to the authenticated user', async () => {
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
      expect(response.body.message).toBe(
        'Conversations retrieved successfully',
      );

      expect(response.body.data.conversations).toHaveLength(2);

      for (const conversation of response.body.data.conversations) {
        expect(conversation.type).toBe('DIRECT');
        expect(conversation.participants).toHaveLength(2);

        expect(
          conversation.participants.some(
            (participant: { user: { id: string } }) =>
              participant.user.id === alice.user.id,
          ),
        ).toBe(true);
      }
    });

    it('returns group conversations belonging to the authenticated user', async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const charlie = await registerUser();
      const delta = await registerUser();

      await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          name: 'Backend Team',
          participantIds: [bob.user.id, charlie.user.id],
        });

      await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          name: 'Frontend Team',
          participantIds: [charlie.user.id, delta.user.id],
        });

      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Conversations retrieved successfully',
      );

      expect(response.body.data.conversations).toHaveLength(2);
      expect(response.body.data.conversations[0].name).toBe('Frontend Team');
      expect(response.body.data.conversations[1].name).toBe('Backend Team');

      for (const conversation of response.body.data.conversations) {
        expect(conversation.type).toBe('GROUP');

        expect(
          conversation.participants.some(
            ({ user }: { user: { id: string } }) => user.id === alice.user.id,
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

  describe('POST /api/conversations/:conversationId/participants', () => {
    it('should add multiple participants to a group conversation', async () => {
      const creator = await registerUser();
      const participantOne = await registerUser();
      const participantTwo = await registerUser();
      const participantThree = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participantOne.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [participantTwo.user.id, participantThree.user.id],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Participants added successfully');

      const participants = response.body.data.participants;

      expect(participants).toHaveLength(2);
      expect(
        participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === participantTwo.user.id,
        ),
      ).toBe(true);
      expect(
        participants.some(
          (participant: { user: { id: string } }) =>
            participant.user.id === participantThree.user.id,
        ),
      ).toBe(true);
    });

    it('should reject adding participants to a direct conversation', async () => {
      const creator = await registerUser();
      const participant = await registerUser();
      const newParticipant = await registerUser();

      const directResponse = await request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userId: participant.user.id,
        });

      const conversationId = directResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [newParticipant.user.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Participants can only be added to group conversations',
      );
    });

    it('should reject when requester is not a participant', async () => {
      const creator = await registerUser();
      const participant = await registerUser();
      const outsider = await registerUser();
      const newParticipant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Private Group',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({
          userIds: [newParticipant.user.id],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Conversation not found');
    });

    it('should reject when one or more users do not exist', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [crypto.randomUUID(), crypto.randomUUID()],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('One or more users not found');
    });

    it('should reject duplicate user IDs', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [participant.user.id, participant.user.id],
        });

      expect(response.status).toBe(400);
    });

    it('should reject an empty userIds array', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject an invalid user ID', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: ['invalid-uuid'],
        });

      expect(response.status).toBe(400);
    });

    it('should reject users who are already participants', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/participants`)
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userIds: [participant.user.id],
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        'One or more users are already participants',
      );
    });
  });

  describe('DELETE /api/conversations/:conversationId/participants/me', () => {
    it('should allow a participant to leave a group conversation', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Development Team',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants/me`)
        .set('Authorization', `Bearer ${participant.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'You left the group conversation successfully',
      );
      expect(response.body.data).toBeNull();

      const conversationResponse = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${participant.token}`);

      expect(conversationResponse.status).toBe(404);
      expect(conversationResponse.body.message).toBe('Conversation not found');
    });

    it('should reject leaving a direct conversation', async () => {
      const creator = await registerUser();
      const participant = await registerUser();

      const directResponse = await request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          userId: participant.user.id,
        });

      const conversationId = directResponse.body.data.conversation.id;

      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants/me`)
        .set('Authorization', `Bearer ${participant.token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'You can only leave group conversations',
      );
    });

    it('should reject when requester is not a participant', async () => {
      const creator = await registerUser();
      const participant = await registerUser();
      const outsider = await registerUser();

      const groupResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${creator.token}`)
        .send({
          name: 'Private Group',
          participantIds: [participant.user.id],
        });

      const conversationId = groupResponse.body.data.conversation.id;

      const response = await request(app)
        .delete(`/api/conversations/${conversationId}/participants/me`)
        .set('Authorization', `Bearer ${outsider.token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Conversation not found');
    });

    it('should reject leaving a nonexistent conversation', async () => {
      const user = await registerUser();

      const response = await request(app)
        .delete(`/api/conversations/${crypto.randomUUID()}/participants/me`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Conversation not found');
    });
  });

  describe('GET /api/conversations/:conversationId', () => {
    it('returns a direct conversation belonging to the authenticated user', async () => {
      const user = await registerUser();
      const targetUser = await registerUser();

      const createResponse = await request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          userId: targetUser.user.id,
        });

      const conversationId = createResponse.body.data.conversation.id;

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Conversation retrieved successfully',
        data: {
          conversation: expect.objectContaining({
            id: conversationId,
            type: 'DIRECT',
            name: null,
            directKey: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            participants: expect.arrayContaining([
              {
                joinedAt: expect.any(String),
                user: {
                  id: user.user.id,
                  displayName: user.user.displayName,
                  avatarUrl: null,
                },
              },
              {
                joinedAt: expect.any(String),
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
    });

    it('returns a group conversation belonging to the authenticated user', async () => {
      const alice = await registerUser();
      const bob = await registerUser();
      const charlie = await registerUser();

      const createResponse = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          name: 'Backend Team',
          participantIds: [bob.user.id, charlie.user.id],
        });

      const conversationId = createResponse.body.data.conversation.id;

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Conversation retrieved successfully',
        data: {
          conversation: expect.objectContaining({
            id: conversationId,
            type: 'GROUP',
            name: 'Backend Team',
            directKey: null,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            participants: expect.arrayContaining([
              {
                joinedAt: expect.any(String),
                user: {
                  id: alice.user.id,
                  displayName: alice.user.displayName,
                  avatarUrl: null,
                },
              },
              {
                joinedAt: expect.any(String),
                user: {
                  id: bob.user.id,
                  displayName: bob.user.displayName,
                  avatarUrl: null,
                },
              },
            ]),
          }),
        },
      });
    });

    it('returns 404 when the conversation does not exist', async () => {
      const user = await registerUser();

      const conversationId = '01999999-9999-7999-8999-999999999999';

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Conversation not found',
        errors: null,
      });
    });

    it('returns 404 when the conversation belongs to another user', async () => {
      const user = await registerUser();
      const otherUser = await registerUser();
      const targetUser = await registerUser();

      const createResponse = await request(app)
        .post('/api/conversations/direct')
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({
          userId: targetUser.user.id,
        });

      const conversationId = createResponse.body.data.conversation.id;

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Conversation not found',
        errors: null,
      });
    });

    it('returns 400 when conversationId is not a valid UUID', async () => {
      const user = await registerUser();

      const response = await request(app)
        .get('/api/conversations/invalid-uuid')
        .set('Authorization', `Bearer ${user.token}`);

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);
    });

    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(
        '/api/conversations/01999999-9999-7999-8999-999999999999',
      );

      expect(response.status).toBe(401);

      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required',
        errors: null,
      });
    });
  });
});
