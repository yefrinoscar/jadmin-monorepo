import { createFileRoute } from "@tanstack/react-router";

const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8080";

// Auth now lives in the backend. Proxy any requests that still hit
// the frontend's /api/auth/* to the backend auth server.
async function proxyToBackend(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}${url.pathname}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const res = await fetch(backendUrl, {
    method: request.method,
    headers,
    body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    // @ts-expect-error duplex is needed for streaming body
    duplex: "half",
  });

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return await proxyToBackend(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return await proxyToBackend(request);
      },
    },
  },
});
