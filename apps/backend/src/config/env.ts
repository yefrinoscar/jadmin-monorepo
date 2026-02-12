// ─── Environment Configuration ───────────────────────────────────────────────

function required(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

function optional(key: string, fallback: string): string {
    return process.env[key] || fallback;
}

export const env = {
    PORT: Number(optional("PORT", "8080")),
    NODE_ENV: optional("NODE_ENV", "development"),

    // Frontend URL (for CORS)
    FRONTEND_URL: optional("FRONTEND_URL", "http://localhost:3000"),

    // Better Auth
    BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: optional("BETTER_AUTH_URL", "http://localhost:8080"),

    // Resend (email)
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    RESEND_FROM_EMAIL: optional("RESEND_FROM_EMAIL", "no-reply@underla.store"),

    // Mistral AI
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "",
    MISTRAL_MODEL: optional("MISTRAL_MODEL", "mistral-small-latest"),

    // System prompt (optional override)
    SYSTEM_PROMPT: process.env.SYSTEM_PROMPT,

    get isDev() {
        return this.NODE_ENV === "development";
    },

    get isProd() {
        return this.NODE_ENV === "production";
    },
} as const;
