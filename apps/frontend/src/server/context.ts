import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function createContext({ req, resHeaders }: FetchCreateContextFnOptions) {
  // Get the session from better-auth
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  return {
    db,
    session,
    req,
    resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
