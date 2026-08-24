import request from 'supertest';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const createUniqueUserData = () => {
  const uuid = crypto.randomUUID().slice(0, 8);
  return {
    username: `user_${uuid}`,
    email: `user_${uuid}@email.com`,
    password: 'Password123#',
    displayName: `User ${uuid}`,
  };
};

describe('Auth API', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('register a new user', async () => {
      const userData = createUniqueUserData();

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User registered successfully',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
          }),
        },
      });
      expect(response.body.data.user).not.toHaveProperty('password');

      const user = await prisma.user.findUnique({
        where: {
          username: userData.username,
        },
      });

      expect(user).not.toBeNull();
      expect(user?.password).not.toBe(userData.password);
    });

    it('rejects duplicate username', async () => {
      const existingUser = createUniqueUserData();
      await prisma.user.create({
        data: {
          ...existingUser,
          password: 'hashed-password',
        },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: existingUser.username,
          email: `another_${crypto.randomUUID().slice(0, 8)}@example.com`,
          password: 'Password123#',
          displayName: 'Another User',
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Username or email is already in use',
        errors: null,
      });
    });

    it('rejects duplicate email', async () => {
      const existingUser = createUniqueUserData();
      await prisma.user.create({
        data: {
          ...existingUser,
          password: 'hashed-password',
        },
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: `another_${crypto.randomUUID().slice(0, 8)}`,
          email: existingUser.email,
          password: 'Password123#',
          displayName: 'Another User',
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

  describe('POST /api/auth/login', () => {
    it('allows user to login with username', async () => {
      const userData = createUniqueUserData();
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });

      const response = await request(app).post('/api/auth/login').send({
        identifier: userData.username,
        password: userData.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
          }),
        },
      });
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('allows user to login with email', async () => {
      const userData = createUniqueUserData();
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });

      const response = await request(app).post('/api/auth/login').send({
        identifier: userData.email,
        password: userData.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
          }),
        },
      });
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('rejects non-existent identifier', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: `nonexistent_${crypto.randomUUID().slice(0, 8)}`,
          password: 'Password123#',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials',
        errors: null,
      });
    });

    it('rejects incorrect password', async () => {
      const userData = createUniqueUserData();
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
        },
      });

      const response = await request(app).post('/api/auth/login').send({
        identifier: userData.username,
        password: 'WrongPassword123#',
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials',
        errors: null,
      });
    });

    it('rejects invalid input', async () => {
      const response = await request(app).post('/api/auth/login').send({
        identifier: '',
        password: '',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });
});
