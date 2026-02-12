import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { appRouter } from "@/server/routers/_app";
import { createContext } from "@/server/context";

/**
 * tRPC API handler using fetch adapter
 * Handles all /api/trpc/* requests
 */
export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext,
        });
      },
      POST: async ({ request }: { request: Request }) => {
        return await fetchRequestHandler({
          endpoint: "/api/trpc",
          req: request,
          router: appRouter,
          createContext,
        });
      },
    },
  },
});
