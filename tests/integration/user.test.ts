import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

describe('Users API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/users/me', () => {
    it('returns the authenticated user', async () => {
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'Password123#',
          displayName: 'Alice',
        });

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: expect.objectContaining({
            username: 'alice',
            email: 'alice@example.com',
            displayName: 'Alice',
          }),
        },
      });

      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('rejects a request without a token', async () => {
      const response = await request(app).get('/api/users/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required',
        errors: null,
      });
    });

    it('rejects an invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid token',
        errors: null,
      });
    });
  });
});
