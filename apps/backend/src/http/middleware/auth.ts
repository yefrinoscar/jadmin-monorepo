import type { IncomingMessage, ServerResponse } from "http";
import { auth } from "../../lib/auth.js";
import { json } from "../router.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
    isDisabled: boolean;
}

export interface AuthenticatedRequest extends IncomingMessage {
    user: AuthUser;
}

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
) => void | Promise<void>;

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

    return new Request(url, {
        method: req.method,
        headers,
    });
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export function requireAuth(handler: RouteHandler): RouteHandler {
    return async (req, res, params) => {
        try {
            const webRequest = toWebRequest(req);
            const session = await auth.api.getSession({ headers: webRequest.headers });

            if (!session?.user) {
                json(res, { error: "No autorizado" }, 401);
                return;
            }

            const user = session.user as AuthUser;

            if (user.isDisabled) {
                json(res, { error: "Tu cuenta está desactivada" }, 403);
                return;
            }

            // Attach user to request
            (req as AuthenticatedRequest).user = user;

            return handler(req, res, params);
        } catch (error) {
            console.error("[auth] Session verification failed:", error);
            json(res, { error: "Error de autenticación" }, 401);
        }
    };
}

// ─── Role-based middleware ───────────────────────────────────────────────────

export function requireRole(...roles: string[]): (handler: RouteHandler) => RouteHandler {
    return (handler) => {
        return requireAuth(async (req, res, params) => {
            const user = (req as AuthenticatedRequest).user;

            if (!roles.includes(user.role)) {
                json(res, { error: "No tienes permisos para esta acción" }, 403);
                return;
            }

            return handler(req, res, params);
        });
    };
}
