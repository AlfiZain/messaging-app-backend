import { Router } from 'express';
import * as messageController from '../controllers/message.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { getDetailUserConversationParamsSchema } from '../schemas/conversation.schema.js';
import {
  createMessageSchema,
  messageStatusParamsSchema,
} from '../schemas/message.schema.js';
import { uploadImage } from '../lib/multer.js';

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
  uploadImage.single('image'),
  validate(createMessageSchema, 'body'),
  messageController.createMessage,
);

nestedMessageRouter.patch(
  '/:messageId/delivered',
  authenticate,
  validate(messageStatusParamsSchema, 'params'),
  messageController.markMessageAsDelivered,
);

nestedMessageRouter.patch(
  '/:messageId/read',
  authenticate,
  validate(messageStatusParamsSchema, 'params'),
  messageController.markMessageAsRead,
);
