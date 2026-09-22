import { openApiRegistry } from '../registry.js';
import {
  addConversationParticipantsBodySchema,
  addConversationParticipantsParamsSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  getDetailUserConversationParamsSchema,
  leaveGroupConversationParamsSchema,
} from '../../schemas/conversation.schema.js';
import {
  conversationResponseSchema,
  conversationsResponseSchema,
  participantsResponseSchema,
} from '../schemas/conversation.openapi.js';
import {
  emptyDataSuccessResponseSchema,
  errorResponseSchema,
} from '../schemas/common.openapi.js';

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/conversations/direct',
  tags: ['Conversations'],
  summary: 'Create or retrieve a direct conversation',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createDirectConversationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Conversation created successfully',
      content: {
        'application/json': {
          schema: conversationResponseSchema,
        },
      },
    },
    400: {
      description: 'Cannot create a conversation with yourself',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'User not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/conversations/group',
  tags: ['Conversations'],
  summary: 'Create a group conversation',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createGroupConversationSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Group conversation created successfully',
      content: {
        'application/json': {
          schema: conversationResponseSchema,
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
    404: {
      description: 'One or more users not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/conversations',
  tags: ['Conversations'],
  summary: 'Get current user conversations',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Conversations retrieved successfully',
      content: {
        'application/json': {
          schema: conversationsResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/conversations/{conversationId}',
  tags: ['Conversations'],
  summary: 'Get conversation details',
  security: [{ bearerAuth: [] }],
  request: {
    params: getDetailUserConversationParamsSchema,
  },
  responses: {
    200: {
      description: 'Conversation retrieved successfully',
      content: {
        'application/json': {
          schema: conversationResponseSchema,
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
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'post',
  path: '/api/conversations/{conversationId}/participants',
  tags: ['Conversations'],
  summary: 'Add participants to a group conversation',
  security: [{ bearerAuth: [] }],
  request: {
    params: addConversationParticipantsParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: addConversationParticipantsBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Participants added successfully',
      content: {
        'application/json': {
          schema: participantsResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid conversation type or validation failed',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'Conversation or user not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    409: {
      description: 'One or more users are already participants',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});

openApiRegistry.registerPath({
  method: 'delete',
  path: '/api/conversations/{conversationId}/participants/me',
  tags: ['Conversations'],
  summary: 'Leave a group conversation',
  security: [{ bearerAuth: [] }],
  request: {
    params: leaveGroupConversationParamsSchema,
  },
  responses: {
    200: {
      description: 'You left the group conversation successfully',
      content: {
        'application/json': {
          schema: emptyDataSuccessResponseSchema,
        },
      },
    },
    400: {
      description: 'User can only leave group conversations',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'Conversation not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
