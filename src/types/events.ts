export type ConversationParticipantEvent = {
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  joinedAt: Date;
};

export type ConversationSummaryEvent = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string | null;
  participants: ConversationParticipantEvent[];
};

export type MessageCreatedEvent = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  readAt: Date | null;
  sender: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type UserPresenceEvent = {
  userId: string;
};

export type MessageStatusEvent = {
  messageId: string;
  conversationId: string;
  senderId: string;
  userId: string;
  timestamp: Date;
};

export type AppEvents = {
  'conversation:participants_added': {
    conversation: ConversationSummaryEvent;
    addedParticipants: ConversationParticipantEvent[];
    onlineUserIds: string[];
  };

  'conversation:participant_left': {
    conversationId: string;
    userId: string;
  };

  'message:created': MessageCreatedEvent;
  'message:delivered': MessageStatusEvent;
  'message:read': MessageStatusEvent;

  'presence:user_online': UserPresenceEvent;
  'presence:user_offline': UserPresenceEvent;
};
