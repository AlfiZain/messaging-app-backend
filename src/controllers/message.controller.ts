import type { Request, Response } from 'express';
import * as messageService from '../services/message.service.js';

export async function createMessage(req: Request, res: Response) {
  const message = await messageService.createMessage(
    req.params.conversationId as string,
    req.userId!,
    req.body,
    req.file,
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

export async function markMessageAsDelivered(req: Request, res: Response) {
  const message = await messageService.markMessageAsDelivered(
    req.params.conversationId as string,
    req.params.messageId as string,
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'Message marked as delivered successfully',
    data: { message },
  });
}

export async function markMessageAsRead(req: Request, res: Response) {
  const message = await messageService.markMessageAsRead(
    req.params.conversationId as string,
    req.params.messageId as string,
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'Message marked as read successfully',
    data: { message },
  });
}
