import { createAuthClient } from "better-auth/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  fetchOptions: {
    credentials: "include",
  },
});

export const { 
  signIn, 
  signUp, 
  signOut, 
  useSession,
  resetPassword,
} = authClient;


