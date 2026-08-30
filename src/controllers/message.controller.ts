import type { Request, Response } from 'express';
import * as messageService from '../services/message.service.js';

export async function createMessage(req: Request, res: Response) {
  const message = await messageService.createMessage(
    req.params.conversationId as string,
    req.userId!,
    req.body,
  );

  return res.status(201).json({
    success: true,
    message: 'Message sent successfully',
    data: { message },
  });
}

export async function getConversationMessages(req: Request, res: Response) {
  const messages = await messageService.getConversationMessages(
    req.params.conversationId as string,
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'Messages retrieved successfully',
    data: { messages },
  });
}
