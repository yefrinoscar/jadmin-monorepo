import { createServer } from "http";
import { WebSocketServer } from "ws";
import { env } from "./config/env.js";
import { handleRequest } from "./http/router.js";
import { handleConnection, getConnectionCount } from "./ws/handler.js";

// ─── Create servers ──────────────────────────────────────────────────────────

const server = createServer(handleRequest);
const wss = new WebSocketServer({ server });

// ─── WebSocket events ────────────────────────────────────────────────────────

wss.on("connection", (ws, req) => {
    console.log(`[ws] connected (total: ${wss.clients.size})`);
    handleConnection(ws, req);

    ws.on("close", () => {
        console.log(`[ws] disconnected (total: ${wss.clients.size})`);
    });
});

// ─── Start ───────────────────────────────────────────────────────────────────

export function start(): void {
    server.listen(env.PORT, () => {
        console.log(`\n🚀 Backend running on http://localhost:${env.PORT}`);
        console.log(`   WebSocket: ws://localhost:${env.PORT}`);
        console.log(`   Health:    http://localhost:${env.PORT}/health`);
        console.log(`   Auth:      http://localhost:${env.PORT}/api/auth`);
        console.log(`   Users API: http://localhost:${env.PORT}/api/users`);
        console.log(`   Frontend:  ${env.FRONTEND_URL}`);
        console.log(`   Model:     ${env.MISTRAL_MODEL}`);
        console.log(`   API Key:   ${env.MISTRAL_API_KEY ? "✓ configured" : "✗ missing"}`);
        console.log(`   Env:       ${env.NODE_ENV}\n`);
    });
}
