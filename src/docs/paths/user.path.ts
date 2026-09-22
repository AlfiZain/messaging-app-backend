import { openApiRegistry } from '../registry.js';
import {
  changePasswordSchema,
  updateProfileSchema,
} from '../../schemas/user.schema.js';
import {
  updateAvatarRequestSchema,
  userResponseSchema,
} from '../schemas/user.openapi.js';
import {
  emptyDataSuccessResponseSchema,
  errorResponseSchema,
} from '../schemas/common.openapi.js';

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Get current user profile',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User retrieved successfully',
      content: {
        'application/json': {
          schema: userResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid token',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/users/me',
  tags: ['Users'],
  summary: 'Update current user profile',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: updateProfileSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: userResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid token',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/users/me/password',
  tags: ['Users'],
  summary: 'Change current user password',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: changePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Password changed successfully',
      content: {
        'application/json': {
          schema: emptyDataSuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid token or invalid credentials',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'patch',
  path: '/api/users/me/avatar',
  tags: ['Users'],
  summary: 'Update current user profile picture',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: updateAvatarRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile picture updated successfully',
      content: {
        'application/json': {
          schema: userResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid or missing avatar image',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid token',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    502: {
      description: 'Cloudinary upload failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
