import jwt from 'jsonwebtoken';
import { env } from '../configs/env.js';

export function generateAccessToken(userId: string) {
  return jwt.sign(
    {
      sub: userId,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    },
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtSecret);
}
