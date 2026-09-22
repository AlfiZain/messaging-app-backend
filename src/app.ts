import express from 'express';
import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';
import { errorHandler } from './middlewares/error.middleware.js';
import conversationRouter from './routes/conversation.route.js';
import { docsRouter } from './routes/docs.route.js';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/conversations', conversationRouter);

app.use('/api/docs', docsRouter);

app.use(errorHandler);

export default app;
