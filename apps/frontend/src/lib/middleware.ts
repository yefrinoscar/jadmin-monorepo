import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { USER_ROLES } from "@/lib/constants";

const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8080";

// ─── Helper: get session from backend auth server ────────────────────────────

async function getSessionFromBackend(headers: Headers) {
  try {
    const cookie = headers.get("cookie");
    if (!cookie) return null;

    const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.session && data?.user ? { session: data.session, user: data.user } : null;
  } catch {
    return null;
  }
}

// Middleware to protect routes - requires authentication
export const authMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await getSessionFromBackend(headers);

    if (!session) {
      throw redirect({ to: "/login", search: { error: undefined, redirect: undefined } });
    }

    // Check if user is disabled
    const user = session.user as { isDisabled?: boolean };
    if (user.isDisabled) {
      throw redirect({ to: "/login", search: { error: "disabled", redirect: undefined } });
    }

    return await next({ context: { session } });
  }
);

// Middleware for admin-only routes (admin and superadmin)
export const adminMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await getSessionFromBackend(headers);

    if (!session) {
      throw redirect({ to: "/login", search: { error: undefined, redirect: undefined } });
    }

    // Check if user is disabled
    const user = session.user as { isDisabled?: boolean; role?: string };
    if (user.isDisabled) {
      throw redirect({ to: "/login", search: { error: "disabled", redirect: undefined } });
    }

    // Check if user has admin or superadmin role
    const allowedRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN];
    if (!user.role || !allowedRoles.includes(user.role as typeof USER_ROLES.ADMIN)) {
      throw redirect({ to: "/chat-soporte" });
    }

    return await next({ context: { session } });
  }
);

// Middleware to redirect authenticated users away from public routes (login, signup)
export const guestMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await getSessionFromBackend(headers);

    if (session) {
      const user = session.user as { isDisabled?: boolean };
      if (user.isDisabled) {
        return await next();
      }
      throw redirect({ to: "/chat-soporte" });
    }

    return await next();
  }
);
