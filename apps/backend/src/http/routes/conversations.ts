import type { IncomingMessage, ServerResponse } from "http";
import { json, parseBody } from "../router.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { pushToConversation } from "../../ws/handler.js";
import {
    createConversation,
    getConversation,
    listConversations,
    updateConversation,
    closeConversation,
    escalateConversation,
    addMessage,
    getMessages,
    getConversationStats,
} from "../../lib/conversations.js";

// ─── GET /api/conversations ──────────────────────────────────────────────────

export async function listConversationsRoute(
    req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const status = url.searchParams.get("status") as
        | "active"
        | "waiting"
        | "closed"
        | "escalated"
        | null;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const conversations = await listConversations({
        status: status ?? undefined,
        limit,
        offset,
    });

    json(res, { data: conversations });
}

// ─── POST /api/conversations ─────────────────────────────────────────────────

export async function createConversationRoute(
    req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const conv = await createConversation({
        visitorIp: ip,
        visitorUserAgent: userAgent,
    });

    json(res, { data: conv }, 201);
}

// ─── GET /api/conversations/:id ──────────────────────────────────────────────

export async function getConversationRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const conv = await getConversation(id);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }
    json(res, { data: conv });
}

// ─── PATCH /api/conversations/:id ────────────────────────────────────────────

export async function updateConversationRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const body = await parseBody<{
        status?: "active" | "waiting" | "closed" | "escalated";
        assignedToId?: string | null;
        needsHuman?: boolean;
    }>(req);

    const conv = await updateConversation(id, body);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }
    json(res, { data: conv });
}

// ─── POST /api/conversations/:id/close ───────────────────────────────────────

export async function closeConversationRoute(
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const conv = await closeConversation(id);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }
    json(res, { data: conv });
}

// ─── POST /api/conversations/:id/escalate ────────────────────────────────────

export async function escalateConversationRoute(
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const conv = await escalateConversation(id);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }
    json(res, { data: conv });
}

// ─── GET /api/conversations/:id/messages ─────────────────────────────────────

export async function getMessagesRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const conv = await getConversation(id);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const limit = Number(url.searchParams.get("limit")) || 200;
    const offset = Number(url.searchParams.get("offset")) || 0;

    const messages = await getMessages(id, { limit, offset });
    json(res, { data: messages });
}

// ─── POST /api/conversations/:id/messages ────────────────────────────────────

export async function addMessageRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const { id } = params;
    const conv = await getConversation(id);
    if (!conv) {
        json(res, { error: "Conversation not found" }, 404);
        return;
    }

    const body = await parseBody<{ content: string; role?: "assistant" | "system" }>(req);
    if (!body.content?.trim()) {
        json(res, { error: "Message content is required" }, 400);
        return;
    }

    // Auto-assign conversation to the admin who sends the message (takes over from AI)
    const user = (req as AuthenticatedRequest).user;
    if (!conv.assignedToId && user) {
        await updateConversation(id, { assignedToId: user.id });
    }

    const role = body.role === "system" ? "system" : "assistant";
    const msg = await addMessage(id, role, body.content.trim());

    // Push message to visitor's active WebSocket connection (if connected)
    pushToConversation(id, body.content.trim());

    json(res, { data: msg }, 201);
}

// ─── GET /api/conversations/stats ────────────────────────────────────────────

export async function getStatsRoute(
    _req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    const stats = await getConversationStats();
    json(res, { data: stats });
}
