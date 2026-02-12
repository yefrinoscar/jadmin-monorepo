import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { backendApi } from "@/lib/backend";

// ─── Helper: extract cookie from tRPC request context ────────────────────────

function getCookie(ctx: { req: Request }): string {
    return ctx.req.headers.get("cookie") || "";
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CollectedInfo {
    name?: string;
    email?: string;
    reason?: string;
    phone?: string;
}

interface Conversation {
    id: string;
    status: "active" | "waiting" | "closed" | "escalated";
    collectedInfo: CollectedInfo;
    needsHuman: boolean;
    assignedToId: string | null;
    visitorIp: string | null;
    visitorUserAgent: string | null;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
}

interface Message {
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
}

interface ConversationStats {
    total: number;
    active: number;
    waiting: number;
    escalated: number;
    closed: number;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const conversationRouter = router({
    /**
     * List conversations with optional filters
     */
    list: protectedProcedure
        .input(
            z.object({
                status: z.enum(["active", "waiting", "closed", "escalated"]).optional(),
                limit: z.number().min(1).max(100).optional(),
                offset: z.number().min(0).optional(),
            }).optional(),
        )
        .query(async ({ ctx, input }) => {
            const params = new URLSearchParams();
            if (input?.status) params.set("status", input.status);
            if (input?.limit) params.set("limit", String(input.limit));
            if (input?.offset) params.set("offset", String(input.offset));

            const qs = params.toString();
            const path = `/api/conversations${qs ? `?${qs}` : ""}`;

            const res = await backendApi<{ data: Conversation[] }>(path, {
                cookie: getCookie(ctx),
            });
            return res.data;
        }),

    /**
     * Get a single conversation by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                const res = await backendApi<{ data: Conversation }>(
                    `/api/conversations/${input.id}`,
                    { cookie: getCookie(ctx) },
                );
                return res.data;
            } catch {
                return null;
            }
        }),

    /**
     * Get messages for a conversation
     */
    messages: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                limit: z.number().min(1).max(500).optional(),
                offset: z.number().min(0).optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const params = new URLSearchParams();
            if (input.limit) params.set("limit", String(input.limit));
            if (input.offset) params.set("offset", String(input.offset));

            const qs = params.toString();
            const path = `/api/conversations/${input.conversationId}/messages${qs ? `?${qs}` : ""}`;

            const res = await backendApi<{ data: Message[] }>(path, {
                cookie: getCookie(ctx),
            });
            return res.data;
        }),

    /**
     * Get conversation stats
     */
    stats: protectedProcedure.query(async ({ ctx }) => {
        const res = await backendApi<{ data: ConversationStats }>(
            "/api/conversations/stats",
            { cookie: getCookie(ctx) },
        );
        return res.data;
    }),

    /**
     * Update a conversation (status, assignment, flags)
     */
    update: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                status: z.enum(["active", "waiting", "closed", "escalated"]).optional(),
                assignedToId: z.string().nullable().optional(),
                needsHuman: z.boolean().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...body } = input;
            try {
                const res = await backendApi<{ data: Conversation }>(
                    `/api/conversations/${id}`,
                    { method: "PATCH", cookie: getCookie(ctx), body },
                );
                return res.data;
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),

    /**
     * Close a conversation
     */
    close: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                const res = await backendApi<{ data: Conversation }>(
                    `/api/conversations/${input.id}/close`,
                    { method: "POST", cookie: getCookie(ctx) },
                );
                return res.data;
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),

    /**
     * Escalate a conversation
     */
    escalate: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                const res = await backendApi<{ data: Conversation }>(
                    `/api/conversations/${input.id}/escalate`,
                    { method: "POST", cookie: getCookie(ctx) },
                );
                return res.data;
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),

    /**
     * Send a message as agent into a conversation
     */
    sendMessage: protectedProcedure
        .input(
            z.object({
                conversationId: z.string(),
                content: z.string().min(1),
                role: z.enum(["assistant", "system"]).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const res = await backendApi<{ data: Message }>(
                    `/api/conversations/${input.conversationId}/messages`,
                    {
                        method: "POST",
                        cookie: getCookie(ctx),
                        body: { content: input.content, role: input.role },
                    },
                );
                return res.data;
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),

    /**
     * Assign conversation to current user
     */
    assign: protectedProcedure
        .input(
            z.object({
                id: z.string(),
                assignedToId: z.string().nullable(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { id, assignedToId } = input;
            try {
                const res = await backendApi<{ data: Conversation }>(
                    `/api/conversations/${id}`,
                    { method: "PATCH", cookie: getCookie(ctx), body: { assignedToId } },
                );
                return res.data;
            } catch (error: any) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message,
                });
            }
        }),
});
