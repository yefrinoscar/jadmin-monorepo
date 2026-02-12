import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { generateAIResponse, isInfoComplete } from "../lib/ai.js";
import {
    createConversation,
    getConversation,
    addMessage,
    updateConversation,
    escalateConversation,
    closeConversation,
} from "../lib/conversations.js";
import type { ClientMessage, ServerMessage, ConnectionState } from "../types/index.js";

// ─── Per-connection state ────────────────────────────────────────────────────

const connections = new Map<WebSocket, ConnectionState>();

export function getConnectionCount(): number {
    return connections.size;
}

/**
 * Push a message from the REST API to an active WebSocket connection.
 * Used when an admin sends a message via the dashboard.
 */
export function pushToConversation(conversationId: string, content: string): boolean {
    for (const [ws, state] of connections) {
        if (state.conversationId === conversationId) {
            send(ws, {
                type: "response",
                content,
                conversationId,
                collectedInfo: state.collectedInfo,
                needsHuman: true,
                infoComplete: false,
            });
            return true;
        }
    }
    return false; // no active WS for this conversation
}

// ─── Send helper ─────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

// ─── Connection handler ─────────────────────────────────────────────────────

export async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    // State starts without a conversationId — created lazily on first message
    const state: ConnectionState = {
        conversationId: "",
        messages: [],
        collectedInfo: {},
    };
    connections.set(ws, state);

    // Notify client the WS is ready (no conversation yet)
    send(ws, { type: "connected", conversationId: "" });

    ws.on("message", async (raw) => {
        let parsed: ClientMessage;

        try {
            parsed = JSON.parse(raw.toString());
        } catch {
            send(ws, { type: "error", content: "Invalid JSON" });
            return;
        }

        if (parsed.type === "clear") {
            state.messages = [];
            state.collectedInfo = {};
            send(ws, { type: "cleared" });
            return;
        }

        if (parsed.type === "message") {
            const content = parsed.content?.trim();
            if (!content) {
                send(ws, { type: "error", content: "Empty message" });
                return;
            }

            // Lazy conversation creation: only on first real message
            if (!state.conversationId) {
                try {
                    const conv = await createConversation({ visitorIp: ip, visitorUserAgent: userAgent });
                    state.conversationId = conv.id;
                    // Notify client of the new conversation ID
                    send(ws, { type: "connected", conversationId: conv.id });
                } catch (err) {
                    console.error("[ws] Failed to create conversation:", err);
                    send(ws, { type: "error", content: "Error al iniciar conversación." });
                    return;
                }
            }

            state.messages.push({ role: "user", content });

            // Persist user message to DB
            try {
                await addMessage(state.conversationId, "user", content);
            } catch (err) {
                console.error("[ws] Failed to persist user message:", err);
            }

            // Check if a human agent has taken over this conversation
            try {
                const conv = await getConversation(state.conversationId);
                if (conv?.assignedToId) {
                    // Human is in control — message already persisted above, no AI response.
                    // Admin will see it via polling in the dashboard.
                    return;
                }
            } catch (err) {
                console.error("[ws] Failed to check conversation state:", err);
            }

            try {
                const result = await generateAIResponse(state.messages, {
                    collectedInfo: state.collectedInfo,
                });

                state.collectedInfo = result.extractedInfo;
                state.messages.push({ role: "assistant", content: result.response });

                // Persist assistant message + update conversation state in DB
                try {
                    await addMessage(state.conversationId, "assistant", result.response);
                    await updateConversation(state.conversationId, {
                        collectedInfo: result.extractedInfo,
                        needsHuman: result.needsHuman,
                    });

                    // Auto-escalate if AI detected human need
                    if (result.needsHuman) {
                        await escalateConversation(state.conversationId);
                    }

                    // Auto-close if info is complete
                    if (isInfoComplete(result.extractedInfo)) {
                        await updateConversation(state.conversationId, {
                            status: "waiting",
                        });
                    }
                } catch (err) {
                    console.error("[ws] Failed to persist AI response:", err);
                }

                send(ws, {
                    type: "response",
                    content: result.response,
                    conversationId: state.conversationId,
                    collectedInfo: result.extractedInfo,
                    needsHuman: result.needsHuman,
                    infoComplete: isInfoComplete(result.extractedInfo),
                });
            } catch (err) {
                console.error("[ws] AI error:", err);
                send(ws, {
                    type: "error",
                    content: "Error al generar respuesta. Intenta de nuevo.",
                });
            }

            return;
        }

        send(ws, {
            type: "error",
            content: `Tipo de mensaje desconocido: ${(parsed as any).type}`,
        });
    });

    ws.on("close", async () => {
        // Only close conversation if one was actually created
        try {
            if (state.conversationId) {
                await closeConversation(state.conversationId);
            }
        } catch (err) {
            console.error("[ws] Failed to close conversation:", err);
        }
        connections.delete(ws);
    });

    ws.on("error", (err) => {
        console.error("[ws] error:", err);
        connections.delete(ws);
    });
}
