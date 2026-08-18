import express, { type ErrorRequestHandler } from 'express';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
  });
});

app.use(((err, _req, res, _next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}) as ErrorRequestHandler);

export default app;
