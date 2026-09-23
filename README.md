# Messaging App Backend

REST API and real-time backend for a messaging application built with
Node.js, TypeScript, Express, Prisma, PostgreSQL, and Socket.IO.

## Features

- JWT authentication with username/email login
- User profile and password management
- Cloudinary avatar uploads
- Direct and group conversations
- Participant management
- Text and image messages
- Message delivered/read status
- Online/offline presence
- Real-time messaging with Socket.IO
- Zod validation
- Centralized error handling
- Prisma + PostgreSQL
- Vitest + Supertest integration testing
- OpenAPI documentation and Swagger UI

## Tech Stack

- Node.js
- TypeScript
- Express
- Prisma
- PostgreSQL
- Socket.IO
- Zod
- JSON Web Token
- bcrypt
- Multer
- Cloudinary
- Vitest
- Supertest
- `@asteasolutions/zod-to-openapi`
- Swagger UI Express

## Installation

```bash
git clone <repository-url>
cd backend
npm install
```

Create `.env` and `.env.test`, then generate Prisma Client and run
migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start development:

```bash
npm run dev
```

Default API base URL:

```text
http://localhost:3000/api
```

## Environment Variables

Development `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/messaging_app"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

Test `.env.test` should use a separate test database:

```env
NODE_ENV=test
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/messaging_app_test"
JWT_SECRET="test-secret-key"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

When `NODE_ENV=test`, the centralized environment configuration loads
`.env.test`; otherwise it loads `.env`.

Do not commit either environment file.

## Database

The project uses Prisma with PostgreSQL.

```bash
npx prisma migrate dev
npx prisma generate
```

Main models:

- `User`
- `Conversation`
- `ConversationParticipant`
- `Message`

Conversations support `DIRECT` and `GROUP` types. Entity IDs use UUID
v7.

## API Documentation

Swagger UI:

```text
http://localhost:3000/api/docs
```

OpenAPI JSON:

```text
http://localhost:3000/api/docs/openapi.json
```

Documentation covers authentication, users, conversations, messages,
image uploads, message status, request validation, responses, and
security requirements.

## Authentication

REST protected endpoints use:

```http
Authorization: Bearer <access-token>
```

Socket.IO authentication uses:

```ts
const socket = io('http://localhost:3000', {
  auth: {
    token: '<access-token>',
  },
});
```

## REST API Overview

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
```

### Users

```text
GET   /api/users/me
PATCH /api/users/me
PATCH /api/users/me/password
PATCH /api/users/me/avatar
```

### Conversations

```text
POST   /api/conversations/direct
POST   /api/conversations/group
GET    /api/conversations
GET    /api/conversations/:conversationId
POST   /api/conversations/:conversationId/participants
DELETE /api/conversations/:conversationId/participants/me
```

### Messages

```text
GET   /api/conversations/:conversationId/messages
POST  /api/conversations/:conversationId/messages
PATCH /api/conversations/:conversationId/messages/:messageId/delivered
PATCH /api/conversations/:conversationId/messages/:messageId/read
```

### Health

```text
GET /api/health
```

Use Swagger UI for complete request and response details.

## Image Uploads

Multer receives multipart uploads in memory and Cloudinary stores the
images.

Supported types:

```text
JPEG
PNG
WebP
```

Maximum file size:

```text
512 KB
```

Avatar:

```text
PATCH /api/users/me/avatar
```

Field:

```text
avatar
```

Message image:

```text
POST /api/conversations/:conversationId/messages
```

Fields:

```text
content
image
```

## Socket.IO

### Client → Server

```text
join_conversation
send_message
mark_message_delivered
mark_message_read
```

### Server → Client

```text
conversation_joined
conversation_error
new_message
message_delivered
message_read
message_error
participant_added
conversation_added
participant_left
conversation_removed
user_online
user_offline
```

Detailed payload contracts are documented in:

```text
src/docs/socket-events.md
```

Authenticated sockets join:

```text
user:{userId}
```

Conversation sockets join:

```text
conversation:{conversationId}
```

## Internal Application Events

A typed `EventEmitter` decouples services from Socket.IO.

```text
conversation:participants_added
conversation:participant_left
message:created
message:delivered
message:read
presence:user_online
presence:user_offline
```

The flow is:

```text
Service
  ↓
EventEmitter
  ↓
Socket.IO event handler
  ↓
Connected clients
```

## Validation and Responses

Zod validation errors use:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

Successful responses:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Empty successful responses use:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": null
}
```

General errors:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": null
}
```

## Testing

The project uses Vitest and Supertest.

```bash
npm test
```

Integration tests use a separate PostgreSQL test database and reset
database state between tests.

## Project Structure

```text
src/
├── configs/
├── controllers/
├── docs/
│   ├── openapi.ts
│   ├── registry.ts
│   ├── socket-events.md
│   ├── paths/
│   └── schemas/
├── lib/
├── middlewares/
├── repositories/
├── routes/
├── schemas/
├── services/
├── socket/
├── types/
├── utils/
├── app.ts
└── server.ts

tests/
└── integration/
```

## Architecture

The REST application follows:

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma / PostgreSQL
```

Socket.IO handlers use the service layer for business operations.
Internal application events keep business logic independent from the
Socket.IO transport layer.

Repositories and services use function-based abstractions rather than
classes.
