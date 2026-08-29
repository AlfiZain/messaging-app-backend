import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createDirectConversationSchema,
  getDetailUserConversationParamsSchema,
} from '../schemas/conversation.schema.js';
import * as conversationController from '../controllers/conversation.controller.js';

const conversationRouter = Router();

conversationRouter.post(
  '/direct',
  authenticate,
  validate(createDirectConversationSchema),
  conversationController.createDirectConversation,
);

conversationRouter.get(
  '/',
  authenticate,
  conversationController.getConversations,
);

conversationRouter.get(
  '/:conversationId',
  authenticate,
  validate(getDetailUserConversationParamsSchema, 'params'),
  conversationController.getDetailUserConversation,
);

export default conversationRouter;
