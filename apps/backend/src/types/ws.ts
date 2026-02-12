import type { CollectedInfo } from "./chat.js";

// ─── WebSocket Protocol ──────────────────────────────────────────────────────

/**
 * Client → Server:
 *   { type: "message", content: "hello" }
 *   { type: "clear" }
 *
 * Server → Client:
 *   { type: "connected", conversationId: "uuid" }
 *   { type: "response", content: "...", conversationId: "uuid", collectedInfo: {...}, needsHuman: false, infoComplete: false }
 *   { type: "cleared" }
 *   { type: "error", content: "error message" }
 */

export interface ClientMessage {
    type: "message" | "clear";
    content?: string;
}

export interface ServerConnected {
    type: "connected";
    conversationId: string;
}

export interface ServerResponse {
    type: "response";
    content: string;
    conversationId: string;
    collectedInfo: CollectedInfo;
    needsHuman: boolean;
    infoComplete: boolean;
}

export interface ServerCleared {
    type: "cleared";
}

export interface ServerError {
    type: "error";
    content: string;
}

export type ServerMessage = ServerConnected | ServerResponse | ServerCleared | ServerError;

// ─── Per-connection state ────────────────────────────────────────────────────

export interface ConnectionState {
    conversationId: string;
    messages: { role: "user" | "assistant"; content: string }[];
    collectedInfo: CollectedInfo;
}
