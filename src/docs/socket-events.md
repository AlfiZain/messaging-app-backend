# Socket.IO Events

This document describes the Socket.IO event contract used by the Messaging App.

Socket.IO is used for real-time communication between clients and the server, while REST endpoints are documented separately through OpenAPI.

## Connection

Clients authenticate when establishing a Socket.IO connection.

### Authentication

The access token must be provided through the Socket.IO handshake:

```ts
io('http://localhost:3000', {
  auth: {
    token: '<JWT_ACCESS_TOKEN>',
  },
});
```

The server verifies the JWT and associates the socket with the authenticated user.

An authenticated socket automatically joins the following private room:

```text
user:{userId}
```

---

# Client → Server Events

These events are emitted by the client.

## `join_conversation`

Joins the authenticated user to a conversation room.

### Payload

```json
{
  "conversationId": "conversation-uuid"
}
```

### Success

The server emits `conversation_joined` to the requesting socket.

### Error

The server emits `conversation_error`.

Possible payload:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "conversationId",
      "message": "Conversation ID must be a valid UUID"
    }
  ]
}
```

or:

```json
{
  "message": "Conversation not found"
}
```

---

## `send_message`

Sends a text message to a conversation.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "content": "Hello!"
}
```

`content` is trimmed and must not exceed 5000 characters.

### Success

There is no direct acknowledgement event.

After the message is created, the server emits `new_message` to the conversation room.

### Error

The server emits `message_error`.

Example:

```json
{
  "message": "Message content or image is required"
}
```

Validation errors:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "conversationId",
      "message": "Conversation ID must be a valid UUID"
    }
  ]
}
```

---

## `mark_message_delivered`

Marks a message as delivered.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "messageId": "message-uuid"
}
```

### Success

The server emits `message_delivered` to the message sender.

### Error

The server emits `message_error`.

---

## `mark_message_read`

Marks a message as read.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "messageId": "message-uuid"
}
```

### Success

The server emits `message_read` to the message sender.

### Error

The server emits `message_error`.

---

# Server → Client Events

These events are emitted by the server.

## `conversation_joined`

Emitted after the client successfully joins a conversation.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "onlineUserIds": [
    "user-uuid-1",
    "user-uuid-2"
  ]
}
```

`onlineUserIds` contains the currently online participants of the conversation.

---

## `conversation_error`

Emitted when a conversation-related Socket.IO operation fails.

### Payload

```json
{
  "message": "Conversation not found"
}
```

Validation errors may include `errors`:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "conversationId",
      "message": "Conversation ID must be a valid UUID"
    }
  ]
}
```

---

## `new_message`

Emitted when a new message is created.

The event is broadcast to the conversation room:

```text
conversation:{conversationId}
```

### Payload

```json
{
  "message": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "senderId": "user-uuid",
    "content": "Hello!",
    "imageUrl": null,
    "createdAt": "2026-01-01T12:00:00.000Z",
    "deliveredAt": null,
    "readAt": null,
    "sender": {
      "id": "user-uuid",
      "displayName": "John Doe",
      "avatarUrl": null
    }
  }
}
```

---

## `message_delivered`

Emitted to the sender when another user marks their message as delivered.

### Payload

```json
{
  "messageId": "message-uuid",
  "conversationId": "conversation-uuid",
  "userId": "recipient-user-uuid",
  "deliveredAt": "2026-01-01T12:00:00.000Z"
}
```

`userId` identifies the user who marked the message as delivered.

---

## `message_read`

Emitted to the sender when another user marks their message as read.

### Payload

```json
{
  "messageId": "message-uuid",
  "conversationId": "conversation-uuid",
  "userId": "recipient-user-uuid",
  "readAt": "2026-01-01T12:00:00.000Z"
}
```

`userId` identifies the user who marked the message as read.

---

## `message_error`

Emitted when a message-related operation fails.

### Payload

```json
{
  "message": "Invalid credentials"
}
```

Validation errors may include `errors`:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "messageId",
      "message": "Message ID must be a valid UUID"
    }
  ]
}
```

---

## `participant_added`

Emitted to the conversation room when new participants are added.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "participants": [
    {
      "joinedAt": "2026-01-01T12:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "displayName": "John Doe",
        "avatarUrl": null
      }
    }
  ],
  "onlineUserIds": [
    "user-uuid-1",
    "user-uuid-2"
  ]
}
```

---

## `conversation_added`

Emitted to each newly added participant.

### Payload

```json
{
  "conversation": {
    "id": "conversation-uuid",
    "type": "GROUP",
    "name": "Project Team",
    "participants": [
      {
        "joinedAt": "2026-01-01T12:00:00.000Z",
        "user": {
          "id": "user-uuid",
          "displayName": "John Doe",
          "avatarUrl": null
        }
      }
    ]
  },
  "onlineUserIds": [
    "user-uuid-1"
  ]
}
```

---

## `participant_left`

Emitted to the conversation room when a participant leaves.

### Payload

```json
{
  "conversationId": "conversation-uuid",
  "userId": "user-uuid"
}
```

---

## `conversation_removed`

Emitted to the user who left a group conversation.

### Payload

```json
{
  "conversationId": "conversation-uuid"
}
```

---

## `user_online`

Emitted to conversations when a user becomes online.

### Payload

```json
{
  "userId": "user-uuid"
}
```

---

## `user_offline`

Emitted to conversations when a user becomes offline.

### Payload

```json
{
  "userId": "user-uuid"
}
```

---

# Internal EventEmitter Events

These events are internal application events. They are not emitted directly by clients.

The application uses `eventEmitter` to decouple services from Socket.IO infrastructure.

## `message:created`

```ts
{
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
}
```

Handled by `registerEventHandler()` and translated into the `new_message` Socket.IO event.

---

## `message:delivered`

```ts
{
  messageId: string;
  conversationId: string;
  senderId: string;
  userId: string;
  timestamp: Date;
}
```

Translated into `message_delivered`.

---

## `message:read`

```ts
{
  messageId: string;
  conversationId: string;
  senderId: string;
  userId: string;
  timestamp: Date;
}
```

Translated into `message_read`.

---

## `conversation:participants_added`

```ts
{
  conversation: ConversationSummaryEvent;
  addedParticipants: ConversationParticipantEvent[];
  onlineUserIds: string[];
}
```

Translated into:

- `participant_added`
- `conversation_added`

---

## `conversation:participant_left`

```ts
{
  conversationId: string;
  userId: string;
}
```

Translated into:

- `participant_left`
- `conversation_removed`

The user's sockets are also removed from the conversation room.

---

## `presence:user_online`

```ts
{
  userId: string;
}
```

Translated into `user_online` for the user's conversations.

---

## `presence:user_offline`

```ts
{
  userId: string;
}
```

Translated into `user_offline` for the user's conversations.

---

# Event Flow

The relationship between application events and Socket.IO events is:

```text
Service
  │
  │ eventEmitter.emit(...)
  ▼
EventEmitter
  │
  ▼
registerEventHandler(io)
  │
  │ Socket.IO emit(...)
  ▼
Connected Clients
```

For example:

```text
messageService
    │
    └── message:created
              │
              ▼
       registerEventHandler()
              │
              └── new_message
                       │
                       ▼
                Conversation Clients
```

This separation keeps business logic independent from Socket.IO infrastructure.
