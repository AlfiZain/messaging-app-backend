import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  changePasswordSchema,
  updateProfileSchema,
} from '../schemas/user.schema.js';
import { uploadImage } from '../lib/multer.js';

const userRouter = Router();

userRouter.get('/me', authenticate, userController.getMe);
userRouter.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  userController.updateProfile,
);
userRouter.patch(
  '/me/password',
  authenticate,
  validate(changePasswordSchema),
  userController.changePassword,
);
userRouter.patch(
  '/me/avatar',
  authenticate,
  uploadImage.single('avatar'),
  userController.updateAvatar,
);

export default userRouter;
