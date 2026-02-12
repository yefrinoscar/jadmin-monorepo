const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8080";

interface BackendRequestOptions {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    cookie?: string;
}

export async function backendApi<T = unknown>(
    path: string,
    options?: BackendRequestOptions,
): Promise<T> {
    const url = `${BACKEND_URL}${path}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options?.headers,
    };

    // Forward cookie for auth
    if (options?.cookie) {
        headers["cookie"] = options.cookie;
    }

    const res = await fetch(url, {
        method: options?.method || "GET",
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
            (error as any).error || `Backend request failed: ${res.status}`,
        );
    }

    return res.json() as Promise<T>;
}
