import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/_app";

/**
 * tRPC React hooks with full type safety
 * Use these throughout your React components
 */
export const trpc = createTRPCReact<AppRouter>();
