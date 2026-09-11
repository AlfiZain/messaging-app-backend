import { verifyAccessToken } from '../jwt.js';
import type { Socket } from 'socket.io';

export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);

    if (typeof payload === 'string' || !payload.sub) {
      return next(new Error('Invalid token'));
    }

    socket.data.userId = payload.sub;

    socket.join(`user:${payload.sub}`);

    next();
  } catch {
    next(new Error('Invalid token'));
  }
}
