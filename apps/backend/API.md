# JAdmin Backend — API Documentation

Base URL: `http://localhost:8080`

---

## Health Check

### `GET /health`

Returns server status and active WebSocket connections.

**Response:**
```json
{
    "status": "ok",
    "uptime": 123.45,
    "connections": 2,
    "timestamp": "2026-02-12T14:00:00.000Z"
}
```

---

## Conversations API

### `GET /api/conversations`

List all conversations with optional filters.

**Query Parameters:**

| Param    | Type   | Default | Description                                      |
|----------|--------|---------|--------------------------------------------------|
| `status` | string | —       | Filter by status: `active`, `waiting`, `closed`, `escalated` |
| `limit`  | number | `50`    | Max results                                      |
| `offset` | number | `0`     | Pagination offset                                |

**Example:**
```bash
curl "http://localhost:8080/api/conversations?status=active&limit=10"
```

**Response:**
```json
{
    "data": [
        {
            "id": "uuid",
            "status": "active",
            "collectedInfo": { "name": "Juan", "email": null, "reason": null },
            "needsHuman": false,
            "assignedToId": null,
            "visitorIp": "127.0.0.1",
            "visitorUserAgent": "Mozilla/5.0...",
            "messageCount": 4,
            "createdAt": "2026-02-12T14:00:00.000Z",
            "updatedAt": "2026-02-12T14:01:00.000Z",
            "closedAt": null
        }
    ]
}
```

---

### `POST /api/conversations`

Create a new conversation (usually done automatically via WebSocket).

**Response:** `201 Created`
```json
{
    "data": {
        "id": "uuid",
        "status": "active",
        "collectedInfo": {},
        "needsHuman": false,
        "messageCount": 0,
        "createdAt": "2026-02-12T14:00:00.000Z",
        "updatedAt": "2026-02-12T14:00:00.000Z"
    }
}
```

---

### `GET /api/conversations/:id`

Get a single conversation by ID.

**Example:**
```bash
curl "http://localhost:8080/api/conversations/abc-123"
```

**Response:**
```json
{ "data": { "id": "abc-123", "status": "active", "..." : "..." } }
```

**Error (404):**
```json
{ "error": "Conversation not found" }
```

---

### `PATCH /api/conversations/:id`

Update a conversation's status, assignment, or flags.

**Body:**
```json
{
    "status": "waiting",
    "assignedToId": "user-uuid",
    "needsHuman": true
}
```

All fields are optional.

**Example:**
```bash
curl -X PATCH "http://localhost:8080/api/conversations/abc-123" \
  -H "Content-Type: application/json" \
  -d '{"assignedToId": "user-uuid"}'
```

---

### `POST /api/conversations/:id/close`

Close a conversation. Sets `status: "closed"` and `closedAt` timestamp.

**Example:**
```bash
curl -X POST "http://localhost:8080/api/conversations/abc-123/close"
```

---

### `POST /api/conversations/:id/escalate`

Escalate a conversation to a human agent. Sets `status: "escalated"` and `needsHuman: true`.

**Example:**
```bash
curl -X POST "http://localhost:8080/api/conversations/abc-123/escalate"
```

---

### `GET /api/conversations/:id/messages`

Get all messages for a conversation, ordered by creation time.

**Query Parameters:**

| Param    | Type   | Default | Description       |
|----------|--------|---------|-------------------|
| `limit`  | number | `200`   | Max results       |
| `offset` | number | `0`     | Pagination offset |

**Example:**
```bash
curl "http://localhost:8080/api/conversations/abc-123/messages"
```

**Response:**
```json
{
    "data": [
        {
            "id": "msg-uuid",
            "conversationId": "abc-123",
            "role": "user",
            "content": "Hola, necesito ayuda",
            "createdAt": "2026-02-12T14:00:00.000Z"
        },
        {
            "id": "msg-uuid-2",
            "conversationId": "abc-123",
            "role": "assistant",
            "content": "¡Hola! Bienvenido a JAdmin. ¿Me podrías decir tu nombre?",
            "createdAt": "2026-02-12T14:00:01.000Z"
        }
    ]
}
```

---

### `GET /api/conversations/stats`

Get conversation statistics (counts by status).

**Example:**
```bash
curl "http://localhost:8080/api/conversations/stats"
```

**Response:**
```json
{
    "data": {
        "total": 150,
        "active": 3,
        "waiting": 12,
        "escalated": 2,
        "closed": 133
    }
}
```

---

## WebSocket Protocol

Connect to `ws://localhost:8080` to start a real-time chat conversation.

### Connection Flow

1. Client connects → server creates a conversation in DB
2. Server sends `connected` event with `conversationId`
3. Client sends messages → server responds with AI + persists to DB
4. On disconnect → conversation is automatically closed

### Client → Server Messages

#### Send a chat message
```json
{ "type": "message", "content": "Hola, necesito ayuda" }
```

#### Clear conversation history (in-memory only)
```json
{ "type": "clear" }
```

### Server → Client Messages

#### Connection established
```json
{
    "type": "connected",
    "conversationId": "uuid"
}
```

#### AI response
```json
{
    "type": "response",
    "content": "¡Hola! Bienvenido a JAdmin. ¿Me podrías decir tu nombre?",
    "conversationId": "uuid",
    "collectedInfo": {
        "name": null,
        "email": null,
        "reason": null,
        "phone": null
    },
    "needsHuman": false,
    "infoComplete": false
}
```

#### Conversation cleared
```json
{ "type": "cleared" }
```

#### Error
```json
{ "type": "error", "content": "Error description" }
```

### Conversation Lifecycle

| Status      | Description                                              |
|-------------|----------------------------------------------------------|
| `active`    | Visitor is chatting with the AI receptionist             |
| `waiting`   | AI collected all info (name, email, reason) — awaiting agent |
| `escalated` | Visitor is frustrated or needs a human — urgent          |
| `closed`    | Conversation ended (visitor disconnected or agent closed)|

### Collected Info

The AI receptionist automatically extracts:

| Field   | Detection Method                                         |
|---------|----------------------------------------------------------|
| `name`  | Patterns like "me llamo X", "soy X", "mi nombre es X"   |
| `email` | Standard email regex                                     |
| `phone` | Phone number patterns (8+ digits)                        |
| `reason`| Any message that doesn't look like just a name or email  |

When `infoComplete: true`, all required fields (name, email, reason) have been collected.

---

## Database Schema

### `conversation` table

| Column             | Type        | Description                          |
|--------------------|-------------|--------------------------------------|
| `id`               | text (PK)   | UUID                                 |
| `status`           | enum        | `active`, `waiting`, `closed`, `escalated` |
| `collected_info`   | jsonb       | `{ name, email, reason, phone }`     |
| `needs_human`      | boolean     | Whether escalation was triggered     |
| `assigned_to_id`   | text (FK)   | References `user.id` (nullable)      |
| `visitor_ip`       | text        | Visitor's IP address                 |
| `visitor_user_agent` | text      | Visitor's browser user agent         |
| `message_count`    | integer     | Total messages in conversation       |
| `created_at`       | timestamp   | When conversation started            |
| `updated_at`       | timestamp   | Last update                          |
| `closed_at`        | timestamp   | When conversation was closed         |

### `message` table

| Column            | Type        | Description                           |
|-------------------|-------------|---------------------------------------|
| `id`              | text (PK)   | UUID                                  |
| `conversation_id` | text (FK)   | References `conversation.id`          |
| `role`            | enum        | `user`, `assistant`, `system`         |
| `content`         | text        | Message content                       |
| `created_at`      | timestamp   | When message was sent                 |

---

## Environment Variables

```env
# Server
PORT=8080

# Database (PostgreSQL)
PGHOST=localhost
PGDATABASE=jadmin
PGUSER=postgres
PGPASSWORD=your_password
PGSSLMODE=require

# Mistral AI
MISTRAL_API_KEY=your_key
MISTRAL_MODEL=mistral-small-latest

# System prompt (optional)
# SYSTEM_PROMPT=Custom system prompt...
```
