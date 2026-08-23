import express, { type ErrorRequestHandler } from 'express';
import { ApiError } from './utils/api-error.js';
import authRouter from './routes/auth.route.js';
import userRouter from './routes/user.route.js';

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

app.use(((err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: null,
  });
}) as ErrorRequestHandler);

export default app;
