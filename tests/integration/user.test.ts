import request from 'supertest';
import crypto from 'crypto';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { uploadImageToCloudinary } from '../../src/lib/cloudinary.js';
import { UploadApiResponse } from 'cloudinary';
import { ApiError } from '../../src/utils/api-error.js';

const createUniqueUserData = () => {
  const uuid = crypto.randomUUID().slice(0, 8);
  return {
    username: `user_${uuid}`,
    email: `user_${uuid}@example.com`,
    password: 'Password123#',
    displayName: `User ${uuid}`,
  };
};

vi.mock('../../src/lib/cloudinary.js', () => ({
  uploadImageToCloudinary: vi.fn(),
}));

vi.mocked(uploadImageToCloudinary).mockResolvedValue({
  secure_url: 'https://res.cloudinary.com/test/avatar.jpg',
  public_id: 'test-user',
} as UploadApiResponse);

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
      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

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
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
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

  describe('PATCH /api/users/me', () => {
    let token: string;

    beforeEach(async () => {
      const userData = createUniqueUserData();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      token = registerResponse.body.data.token;
    });

    it('updates displayName successfully', async () => {
      const updatedData = { displayName: 'New Display Name' };

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: expect.objectContaining({
            displayName: updatedData.displayName,
          }),
        },
      });
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('updates bio successfully', async () => {
      const updatedData = {
        bio: 'Updated bio content',
      };

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.data.user.bio).toBe(updatedData.bio);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('updates multiple fields simultaneously', async () => {
      const updatedData = {
        displayName: 'Updated Name',
        bio: 'Updated bio content',
      };

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.data.user).toEqual(
        expect.objectContaining(updatedData),
      );
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('allows setting bio and avatarUrl to null', async () => {
      const updatedData = {
        bio: null,
        avatarUrl: null,
      };

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.data.user.bio).toBeNull();
      expect(response.body.data.user.avatarUrl).toBeNull();
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('rejects request without token with 401 status', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .send({ displayName: 'No Token User' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required',
        errors: null,
      });
    });

    it('rejects invalid input data with 400 status', async () => {
      const invalidData = {
        displayName: null,
        avatarUrl: 'not-a-valid-url',
      };

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /api/users/me/password', () => {
    let token: string;
    let userData: ReturnType<typeof createUniqueUserData>;

    beforeEach(async () => {
      userData = createUniqueUserData();
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      token = registerResponse.body.data.token;
    });

    it('changes the user password successfully', async () => {
      const response = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'newPassword123#',
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully',
        data: null,
      });
    });

    it('rejects an incorrect current password', async () => {
      const response = await request(app)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newPassword123#',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Invalid credentials',
        errors: null,
      });
    });

    describe('Password Schema Validation', () => {
      it('rejects password without uppercase letter', async () => {
        const response = await request(app)
          .patch('/api/users/me/password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: userData.password,
            newPassword: 'password123#',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeInstanceOf(Array);
      });

      it('rejects password without lowercase letter', async () => {
        const response = await request(app)
          .patch('/api/users/me/password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: userData.password,
            newPassword: 'PASSWORD123#',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeInstanceOf(Array);
      });

      it('rejects password without numbers', async () => {
        const response = await request(app)
          .patch('/api/users/me/password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: userData.password,
            newPassword: 'Password#',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeInstanceOf(Array);
      });

      it('rejects password without special characters', async () => {
        const response = await request(app)
          .patch('/api/users/me/password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: userData.password,
            newPassword: 'Password123',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeInstanceOf(Array);
      });

      it('rejects new password if identical to current password', async () => {
        const response = await request(app)
          .patch('/api/users/me/password')
          .set('Authorization', `Bearer ${token}`)
          .send({
            currentPassword: userData.password,
            newPassword: userData.password,
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeInstanceOf(Array);
      });
    });

    it('rejects an unauthenticated request', async () => {
      const response = await request(app).patch('/api/users/me/password').send({
        currentPassword: 'Password123#',
        newPassword: 'newPassword123#',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/users/me/avatar', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should update profile picture', async () => {
      vi.mocked(uploadImageToCloudinary).mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/test/avatar.jpg',
        public_id: 'test-user',
      } as UploadApiResponse);

      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('fake-image'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.avatarUrl).toBe(
        'https://res.cloudinary.com/test/avatar.jpg',
      );

      expect(uploadImageToCloudinary).toHaveBeenCalledTimes(1);
      expect(uploadImageToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), {
        folder: 'messaging-app/avatars',
        publicId: expect.any(String),
        overwrite: true,
      });
    });

    it('should reject avatar upload without a file', async () => {
      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Avatar image is required');

      expect(uploadImageToCloudinary).not.toHaveBeenCalled();
    });

    it('should reject unsupported file type', async () => {
      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('text-file'), {
          filename: 'document.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      );

      expect(uploadImageToCloudinary).not.toHaveBeenCalled();
    });

    it('should reject avatar larger than 512 KB', async () => {
      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      const largeFile = Buffer.alloc(1024 * 1024);

      const response = await request(app)
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', largeFile, {
          filename: 'large.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('File size must not exceed 512 KB');

      expect(uploadImageToCloudinary).not.toHaveBeenCalled();
    });

    it('should return 502 when Cloudinary upload fails', async () => {
      vi.mocked(uploadImageToCloudinary).mockRejectedValue(
        new ApiError(502, 'Cloudinary upload failed'),
      );

      const userData = createUniqueUserData();

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const token = registerResponse.body.data.token;

      const response = await request(app)
        .patch('/api/users/me/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', Buffer.from('fake-image'), {
          filename: 'avatar.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(502);
      expect(response.body.message).toBe('Cloudinary upload failed');

      expect(uploadImageToCloudinary).toHaveBeenCalledTimes(1);
    });
  });
});
