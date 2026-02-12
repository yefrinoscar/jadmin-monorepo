import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/constants";

// Middleware to protect routes - requires authentication
export const authMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session) {
      throw redirect({ to: "/login", search: { error: undefined, redirect: undefined } });
    }

    // Check if user is disabled
    const user = session.user as { isDisabled?: boolean };
    if (user.isDisabled) {
      // Sign out the disabled user and redirect to login
      throw redirect({ to: "/login", search: { error: "disabled", redirect: undefined } });
    }

    return await next({ context: { session } });
  }
);

// Middleware for admin-only routes (admin and superadmin)
export const adminMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

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
      // Redirect non-admin users to main dashboard
      throw redirect({ to: "/chat-soporte" });
    }

    return await next({ context: { session } });
  }
);

// Middleware to redirect authenticated users away from public routes (login, signup)
export const guestMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (session) {
      // Check if user is disabled before redirecting
      const user = session.user as { isDisabled?: boolean };
      if (user.isDisabled) {
        // Don't redirect disabled users, let them see login with error
        return await next();
      }
      throw redirect({ to: "/chat-soporte" });
    }

    return await next();
  }
);
