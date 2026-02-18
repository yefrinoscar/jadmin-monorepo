# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json

# Install only backend workspace deps
RUN npm ci --workspace=@jadmin/backend

# npm workspaces may fully hoist — ensure the local node_modules dir exists
RUN mkdir -p /app/apps/backend/node_modules

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN npx tsc

# ── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy hoisted node_modules + local node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy compiled output + drizzle migrations + package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/backend/drizzle.config.ts ./apps/backend/drizzle.config.ts
COPY apps/backend/src/db/schema.ts ./apps/backend/src/db/schema.ts

WORKDIR /app/apps/backend

EXPOSE 8080
CMD ["node", "dist/index.js"]
