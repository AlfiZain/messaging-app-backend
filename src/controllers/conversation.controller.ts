import type { Request, Response } from 'express';
import * as conversationService from '../services/conversation.service.js';

export async function createDirectConversation(req: Request, res: Response) {
  const conversation = await conversationService.createDirectConversation(
    req.userId!,
    req.body,
  );

  return res.status(201).json({
    success: true,
    message: 'Conversation created successfully',
    data: { conversation },
  });
}
