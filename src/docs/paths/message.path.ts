import { openApiRegistry } from '../registry.js';
import { getDetailUserConversationParamsSchema } from '../../schemas/conversation.schema.js';
import {
  createMessageSchema,
  messageStatusParamsSchema,
} from '../../schemas/message.schema.js';
import {
  createImageMessageRequestSchema,
  messageResponseSchema,
  messagesResponseSchema,
  messageStatusResponseSchema,
} from '../schemas/message.openapi.js';
import { errorResponseSchema } from '../schemas/common.openapi.js';

openApiRegistry.registerPath({
  method: 'get',
  path: '/api/conversations/{conversationId}/messages',
  tags: ['Messages'],
  summary: 'Get conversation messages',
  security: [{ bearerAuth: [] }],
  request: {
    params: getDetailUserConversationParamsSchema,
  },
  responses: {
    200: {
      description: 'Messages retrieved successfully',
      content: {
        'application/json': {
          schema: messagesResponseSchema,
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
  path: '/api/conversations/{conversationId}/messages',
  tags: ['Messages'],
  summary: 'Send a message',
  security: [{ bearerAuth: [] }],
  request: {
    params: getDetailUserConversationParamsSchema,
    body: {
      required: true,
      content: {
        'application/json': {
          schema: createMessageSchema,
        },
        'multipart/form-data': {
          schema: createImageMessageRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Message sent successfully',
      content: {
        'application/json': {
          schema: messageResponseSchema,
        },
      },
    },
    400: {
      description: 'Validation failed or message content is required',
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
  method: 'patch',
  path: '/api/conversations/{conversationId}/messages/{messageId}/delivered',
  tags: ['Messages'],
  summary: 'Mark a message as delivered',
  security: [{ bearerAuth: [] }],
  request: {
    params: messageStatusParamsSchema,
  },
  responses: {
    200: {
      description: 'Message marked as delivered successfully',
      content: {
        'application/json': {
          schema: messageStatusResponseSchema,
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
    403: {
      description: 'Sender cannot mark their own message as delivered',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'Message or conversation not found',
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
  path: '/api/conversations/{conversationId}/messages/{messageId}/read',
  tags: ['Messages'],
  summary: 'Mark a message as read',
  security: [{ bearerAuth: [] }],
  request: {
    params: messageStatusParamsSchema,
  },
  responses: {
    200: {
      description: 'Message marked as read successfully',
      content: {
        'application/json': {
          schema: messageStatusResponseSchema,
        },
      },
    },
    400: {
      description: 'Message must be delivered before it can be marked as read',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    403: {
      description: 'Sender cannot mark their own message as read',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    404: {
      description: 'Message or conversation not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
});
