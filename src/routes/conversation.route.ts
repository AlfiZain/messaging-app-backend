import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  addConversationParticipantsBodySchema,
  addConversationParticipantsParamsSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  getDetailUserConversationParamsSchema,
} from '../schemas/conversation.schema.js';
import * as conversationController from '../controllers/conversation.controller.js';
import { nestedMessageRouter } from './message.route.js';

const conversationRouter = Router();

conversationRouter.post(
  '/direct',
  authenticate,
  validate(createDirectConversationSchema),
  conversationController.createDirectConversation,
);

conversationRouter.post(
  '/group',
  authenticate,
  validate(createGroupConversationSchema),
  conversationController.createGroupConversation,
);

conversationRouter.get(
  '/',
  authenticate,
  conversationController.getConversations,
);

conversationRouter.post(
  '/:conversationId/participants',
  authenticate,
  validate(addConversationParticipantsParamsSchema, 'params'),
  validate(addConversationParticipantsBodySchema, 'body'),
  conversationController.addConversationParticipants,
);

conversationRouter.get(
  '/:conversationId',
  authenticate,
  validate(getDetailUserConversationParamsSchema, 'params'),
  conversationController.getDetailUserConversation,
);

conversationRouter.use('/:conversationId/messages', nestedMessageRouter);

export default conversationRouter;
