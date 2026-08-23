import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
  const { token, user } = await authService.register(req.body);

  return res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { token, user },
  });
}

export async function login(req: Request, res: Response) {
  const { token, user } = await authService.login(req.body);

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    data: { token, user },
  });
}
