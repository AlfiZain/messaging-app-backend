import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/me', authenticate, userController.getMe);

export default userRouter;
