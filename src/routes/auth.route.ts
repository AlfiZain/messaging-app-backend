import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema } from '../schemas/auth.schema.js';

const authRouter = Router();

authRouter.post('/register', validate(registerSchema), authController.register);

export default authRouter;
