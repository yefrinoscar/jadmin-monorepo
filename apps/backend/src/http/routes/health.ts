import type { IncomingMessage, ServerResponse } from "http";
import { getConnectionCount } from "../../ws/handler.js";

export function healthRoute(_req: IncomingMessage, res: ServerResponse, _params: Record<string, string>): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
        JSON.stringify({
            status: "ok",
            uptime: process.uptime(),
            connections: getConnectionCount(),
            timestamp: new Date().toISOString(),
        }),
    );
}
