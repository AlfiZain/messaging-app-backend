import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '../schemas/user.schema.js';

const userRouter = Router();

userRouter.get('/me', authenticate, userController.getMe);
userRouter.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile,
);

export default userRouter;
