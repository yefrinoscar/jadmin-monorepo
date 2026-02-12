import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    timestamp,
    boolean,
    index,
    pgEnum,
    jsonb,
    integer,
} from "drizzle-orm/pg-core";
import { user } from "./auth.js";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const conversationStatusEnum = pgEnum("conversation_status", [
    "active",
    "waiting",
    "closed",
    "escalated",
]);

export const messageRoleEnum = pgEnum("message_role", [
    "user",
    "assistant",
    "system",
]);

// ─── Collected Info (stored as JSONB) ────────────────────────────────────────

export interface CollectedInfo {
    name?: string;
    email?: string;
    reason?: string;
    phone?: string;
}

// ─── Conversation ────────────────────────────────────────────────────────────

export const conversation = pgTable(
    "conversation",
    {
        id: text("id").primaryKey(),
        status: conversationStatusEnum("status").default("active").notNull(),
        collectedInfo: jsonb("collected_info").$type<CollectedInfo>().default({}).notNull(),
        needsHuman: boolean("needs_human").default(false).notNull(),
        assignedToId: text("assigned_to_id").references(() => user.id, {
            onDelete: "set null",
        }),
        visitorIp: text("visitor_ip"),
        visitorUserAgent: text("visitor_user_agent"),
        messageCount: integer("message_count").default(0).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
        closedAt: timestamp("closed_at"),
    },
    (table) => [
        index("conversation_status_idx").on(table.status),
        index("conversation_assignedTo_idx").on(table.assignedToId),
        index("conversation_createdAt_idx").on(table.createdAt),
    ],
);

export type Conversation = typeof conversation.$inferSelect;
export type NewConversation = typeof conversation.$inferInsert;

// ─── Message ─────────────────────────────────────────────────────────────────

export const message = pgTable(
    "message",
    {
        id: text("id").primaryKey(),
        conversationId: text("conversation_id")
            .notNull()
            .references(() => conversation.id, { onDelete: "cascade" }),
        role: messageRoleEnum("role").notNull(),
        content: text("content").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("message_conversationId_idx").on(table.conversationId),
        index("message_createdAt_idx").on(table.createdAt),
    ],
);

export type Message = typeof message.$inferSelect;
export type NewMessage = typeof message.$inferInsert;

// ─── Relations ───────────────────────────────────────────────────────────────

export const conversationRelations = relations(conversation, ({ one, many }) => ({
    assignedTo: one(user, {
        fields: [conversation.assignedToId],
        references: [user.id],
    }),
    messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
    conversation: one(conversation, {
        fields: [message.conversationId],
        references: [conversation.id],
    }),
}));
