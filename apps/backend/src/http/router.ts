import type { IncomingMessage, ServerResponse } from "http";
import { env } from "../config/env.js";
import { healthRoute } from "./routes/health.js";
import { authRoute } from "./routes/auth.js";
import {
    listConversationsRoute,
    createConversationRoute,
    getConversationRoute,
    updateConversationRoute,
    closeConversationRoute,
    escalateConversationRoute,
    getMessagesRoute,
    addMessageRoute,
    getStatsRoute,
} from "./routes/conversations.js";
import {
    listUsersRoute,
    getUserRoute,
    createUserRoute,
    updateUserRoute,
    updateUserRoleRoute,
    toggleUserDisabledRoute,
    deleteUserRoute,
} from "./routes/users.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

// ─── Route types ─────────────────────────────────────────────────────────────

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
) => void | Promise<void>;

interface Route {
    method: string;
    pattern: RegExp;
    paramNames: string[];
    handler: RouteHandler;
}

// ─── Route builder ───────────────────────────────────────────────────────────

function route(
    method: string,
    path: string,
    handler: RouteHandler,
): Route {
    const paramNames: string[] = [];
    const pattern = new RegExp(
        "^" +
            path.replace(/:([^/]+)/g, (_match, name) => {
                paramNames.push(name);
                return "([^/]+)";
            }) +
            "(?:\\?.*)?$",
    );
    return { method, pattern, paramNames, handler };
}

// ─── Route registry ──────────────────────────────────────────────────────────

const routes: Route[] = [
    // Health (public)
    route("GET", "/health", healthRoute),

    // Conversations (protected — admin/superadmin)
    route("GET", "/api/conversations/stats", requireAuth(getStatsRoute)),
    route("GET", "/api/conversations", requireAuth(listConversationsRoute)),
    route("POST", "/api/conversations", requireAuth(createConversationRoute)),
    route("GET", "/api/conversations/:id", requireAuth(getConversationRoute)),
    route("PATCH", "/api/conversations/:id", requireAuth(updateConversationRoute)),
    route("POST", "/api/conversations/:id/close", requireAuth(closeConversationRoute)),
    route("POST", "/api/conversations/:id/escalate", requireAuth(escalateConversationRoute)),
    route("GET", "/api/conversations/:id/messages", requireAuth(getMessagesRoute)),
    route("POST", "/api/conversations/:id/messages", requireAuth(addMessageRoute)),

    // Users (protected — admin/superadmin)
    route("GET", "/api/users", requireRole("admin", "superadmin")(listUsersRoute)),
    route("POST", "/api/users", requireRole("admin", "superadmin")(createUserRoute)),
    route("GET", "/api/users/:id", requireRole("admin", "superadmin")(getUserRoute)),
    route("PATCH", "/api/users/:id", requireRole("admin", "superadmin")(updateUserRoute)),
    route("PATCH", "/api/users/:id/role", requireRole("admin", "superadmin")(updateUserRoleRoute)),
    route("PATCH", "/api/users/:id/toggle-disabled", requireRole("admin", "superadmin")(toggleUserDisabledRoute)),
    route("DELETE", "/api/users/:id", requireRole("admin", "superadmin")(deleteUserRoute)),
];

// ─── CORS middleware ─────────────────────────────────────────────────────────

function setCors(req: IncomingMessage, res: ServerResponse): void {
    const origin = req.headers.origin;
    const allowedOrigins = [env.FRONTEND_URL];

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }

    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
    res.setHeader("Access-Control-Allow-Credentials", "true");
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

export function json(res: ServerResponse, data: unknown, status = 200): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
}

export function parseBody<T = unknown>(req: IncomingMessage): Promise<T> {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
            try {
                resolve(JSON.parse(body) as T);
            } catch {
                reject(new Error("Invalid JSON body"));
            }
        });
        req.on("error", reject);
    });
}

// ─── Router ──────────────────────────────────────────────────────────────────

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
    setCors(req, res);

    // CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const pathname = req.url?.split("?")[0] ?? "/";

    // Better Auth catch-all: /api/auth/*
    if (pathname.startsWith("/api/auth")) {
        Promise.resolve(authRoute(req, res, {})).catch((err) => {
            console.error(`[http] Error in auth handler:`, err);
            json(res, { error: "Internal server error" }, 500);
        });
        return;
    }

    // Match route with params
    for (const r of routes) {
        if (r.method !== req.method) continue;

        const match = (req.url ?? "").match(r.pattern);
        if (!match) continue;

        const params: Record<string, string> = {};
        r.paramNames.forEach((name, i) => {
            params[name] = match[i + 1];
        });

        Promise.resolve(r.handler(req, res, params)).catch((err) => {
            console.error(`[http] Error in ${r.method} ${pathname}:`, err);
            json(res, { error: "Internal server error" }, 500);
        });
        return;
    }

    // 404
    json(res, { error: "Not found" }, 404);
}
