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

export async function createGroupConversation(req: Request, res: Response) {
  const conversation = await conversationService.createGroupConversation(
    req.userId!,
    req.body,
  );

  return res.status(201).json({
    success: true,
    message: 'Group conversation created successfully',
    data: { conversation },
  });
}

export async function addConversationParticipants(req: Request, res: Response) {
  const participants = await conversationService.addConversationParticipants(
    req.params.conversationId as string,
    req.userId!,
    req.body,
  );

  return res.status(200).json({
    success: true,
    message: 'Participants added successfully',
    data: { participants },
  });
}

export async function leaveGroupConversation(req: Request, res: Response) {
  await conversationService.leaveGroupConversation(
    req.params.conversationId as string,
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'You left the group conversation successfully',
    data: null,
  });
}

export async function getConversations(req: Request, res: Response) {
  const conversations = await conversationService.getUserConversations(
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'Conversations retrieved successfully',
    data: { conversations },
  });
}

export async function getDetailUserConversation(req: Request, res: Response) {
  const conversation = await conversationService.getDetailUserConversation(
    req.params.conversationId as string,
    req.userId!,
  );

  return res.status(200).json({
    success: true,
    message: 'Conversation retrieved successfully',
    data: { conversation },
  });
}
