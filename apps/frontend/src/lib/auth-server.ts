import { auth } from "./auth";

// Server-side function to get session from request headers
export async function getServerSession(headers: Headers) {
  const session = await auth.getSession({
    fetchOptions: {
      headers,
    },
  });
  return session;
}

// Server function to get session - use in loaders
export async function getSession(headers: Headers) {
  try {
    const session = await auth.getSession({
      fetchOptions: {
        headers,
      },
    });
    return session;
  } catch {
    return null;
  }
}
