import type { IncomingMessage, ServerResponse } from "http";
import { auth } from "../../lib/auth.js";

// ─── Convert Node IncomingMessage to Web Request ─────────────────────────────

function toWebRequest(req: IncomingMessage): Request {
    const protocol = "http";
    const host = req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url || "/"}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
            if (Array.isArray(value)) {
                for (const v of value) headers.append(key, v);
            } else {
                headers.set(key, value);
            }
        }
    }

    // For methods that may have a body, we need to collect it
    return new Request(url, {
        method: req.method,
        headers,
        // Body will be piped separately for POST/PUT/PATCH
        ...(req.method !== "GET" && req.method !== "HEAD"
            ? { body: req as unknown as ReadableStream, duplex: "half" as any }
            : {}),
    });
}

// ─── Copy Web Response back to Node ServerResponse ───────────────────────────

async function sendWebResponse(webResponse: Response, res: ServerResponse): Promise<void> {
    res.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()));

    if (webResponse.body) {
        const reader = webResponse.body.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.releaseLock();
        }
    }

    res.end();
}

// ─── Auth catch-all handler ──────────────────────────────────────────────────

export async function authRoute(
    req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    try {
        const webRequest = toWebRequest(req);
        const webResponse = await auth.handler(webRequest);
        await sendWebResponse(webResponse, res);
    } catch (error) {
        console.error("[auth] Handler error:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal auth error" }));
    }
}
