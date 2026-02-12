import { createAuthClient } from "better-auth/client";

const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8080";

// Server-side auth client — used by middleware and tRPC context
// to verify sessions against the backend auth server.
export const auth = createAuthClient({
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: "include",
  },
});
