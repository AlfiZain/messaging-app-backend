import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';

export async function getMe(req: Request, res: Response) {
  const user = await userService.getUserProfile(req.userId!);

  return res.status(200).json({
    success: true,
    message: 'User retrieved successfully',
    data: { user },
  });
}
