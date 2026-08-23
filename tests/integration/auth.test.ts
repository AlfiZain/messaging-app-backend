import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

describe('POST /api/auth/register', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('register a new user', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@email.com',
      password: 'Password123#',
      displayName: 'Alice',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      success: true,
      message: 'User registered successfully',
      data: {
        token: expect.any(String),
        user: expect.objectContaining({
          username: 'alice',
          email: 'alice@email.com',
          displayName: 'Alice',
        }),
      },
    });
    expect(response.body.data.user).not.toHaveProperty('password');

    const user = await prisma.user.findUnique({
      where: {
        username: 'alice',
      },
    });

    expect(user).not.toBeNull();
    expect(user?.password).not.toBe('Password123#');
  });

  it('rejects duplicate username', async () => {
    await prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed-password',
        displayName: 'Alice',
      },
    });

    const response = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'another@example.com',
      password: 'Password123#',
      displayName: 'Another Alice',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Username or email is already in use',
      errors: null,
    });
  });

  it('rejects duplicate email', async () => {
    await prisma.user.create({
      data: {
        username: 'alice',
        email: 'alice@example.com',
        password: 'hashed-password',
        displayName: 'Alice',
      },
    });

    const response = await request(app).post('/api/auth/register').send({
      username: 'another',
      email: 'alice@example.com',
      password: 'Password123#',
      displayName: 'Another Alice',
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: 'Username or email is already in use',
      errors: null,
    });
  });

  it('rejects invalid email', async () => {
    const response = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'invalid-email',
      password: 'Password123#',
      displayName: 'Alice',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toBeInstanceOf(Array);
  });

  describe('Password Schema Validation', () => {
    it('rejects password without uppercase letter', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123#',
        displayName: 'Alice',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('rejects password without lowercase letter', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'PASSWORD123#',
        displayName: 'Alice',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('rejects password without number', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password#',
        displayName: 'Alice',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it('rejects password without special character', async () => {
      const response = await request(app).post('/api/auth/register').send({
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        displayName: 'Alice',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });
});
