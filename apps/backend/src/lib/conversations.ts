import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { conversation, message } from "../db/schema/index.js";
import type { CollectedInfo } from "../db/schema/index.js";
import { generateId } from "./id.js";

// ─── Conversations ───────────────────────────────────────────────────────────

export async function createConversation(opts?: {
    visitorIp?: string;
    visitorUserAgent?: string;
}) {
    const id = generateId();
    const [row] = await db
        .insert(conversation)
        .values({
            id,
            visitorIp: opts?.visitorIp,
            visitorUserAgent: opts?.visitorUserAgent,
        })
        .returning();
    return row;
}

export async function getConversation(id: string) {
    const [row] = await db
        .select()
        .from(conversation)
        .where(eq(conversation.id, id))
        .limit(1);
    return row ?? null;
}

export async function listConversations(opts?: {
    status?: "active" | "waiting" | "closed" | "escalated";
    limit?: number;
    offset?: number;
}) {
    const conditions = [];
    if (opts?.status) {
        conditions.push(eq(conversation.status, opts.status));
    }

    const rows = await db
        .select()
        .from(conversation)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(conversation.createdAt))
        .limit(opts?.limit ?? 50)
        .offset(opts?.offset ?? 0);

    return rows;
}

export async function updateConversation(
    id: string,
    data: {
        status?: "active" | "waiting" | "closed" | "escalated";
        collectedInfo?: CollectedInfo;
        needsHuman?: boolean;
        assignedToId?: string | null;
        closedAt?: Date | null;
    },
) {
    const [row] = await db
        .update(conversation)
        .set(data)
        .where(eq(conversation.id, id))
        .returning();
    return row ?? null;
}

export async function closeConversation(id: string) {
    return updateConversation(id, {
        status: "closed",
        closedAt: new Date(),
    });
}

export async function escalateConversation(id: string) {
    return updateConversation(id, {
        status: "escalated",
        needsHuman: true,
    });
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
) {
    const id = generateId();
    const [row] = await db
        .insert(message)
        .values({ id, conversationId, role, content })
        .returning();

    // Increment message count
    await db
        .update(conversation)
        .set({ messageCount: sql`${conversation.messageCount} + 1` })
        .where(eq(conversation.id, conversationId));

    return row;
}

export async function getMessages(
    conversationId: string,
    opts?: { limit?: number; offset?: number },
) {
    const rows = await db
        .select()
        .from(message)
        .where(eq(message.conversationId, conversationId))
        .orderBy(message.createdAt)
        .limit(opts?.limit ?? 200)
        .offset(opts?.offset ?? 0);

    return rows;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getConversationStats() {
    const [stats] = await db
        .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${conversation.status} = 'active')::int`,
            waiting: sql<number>`count(*) filter (where ${conversation.status} = 'waiting')::int`,
            escalated: sql<number>`count(*) filter (where ${conversation.status} = 'escalated')::int`,
            closed: sql<number>`count(*) filter (where ${conversation.status} = 'closed')::int`,
        })
        .from(conversation);

    return stats;
}
