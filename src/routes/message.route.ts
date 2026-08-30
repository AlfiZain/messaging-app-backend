import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { getDetailUserConversationParamsSchema } from '../schemas/conversation.schema.js';
import { createMessageSchema } from '../schemas/message.schema.js';

export const nestedMessageRouter = Router({ mergeParams: true });

nestedMessageRouter.get(
  '/',
  authenticate,
  validate(getDetailUserConversationParamsSchema, 'params'),
  messageController.getConversationMessages,
);

nestedMessageRouter.post(
  '/',
  authenticate,
  validate(getDetailUserConversationParamsSchema, 'params'),
  validate(createMessageSchema, 'body'),
  messageController.createMessage,
);
