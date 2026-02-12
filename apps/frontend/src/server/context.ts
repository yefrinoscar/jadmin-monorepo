import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8080";

async function getSessionFromBackend(headers: Headers) {
  try {
    const cookie = headers.get("cookie");
    if (!cookie) return null;

    const res = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
      method: "GET",
      headers: { cookie },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.session && data?.user ? { session: data.session, user: data.user } : null;
  } catch {
    return null;
  }
}

export async function createContext({ req, resHeaders }: FetchCreateContextFnOptions) {
  const session = await getSessionFromBackend(req.headers);

  return {
    session,
    req,
    resHeaders,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
