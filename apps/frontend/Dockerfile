# ── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json

RUN npm install --workspace=@jadmin/frontend
RUN mkdir -p /app/apps/frontend/node_modules

# ── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY apps/frontend ./apps/frontend

WORKDIR /app/apps/frontend

# VITE_BACKEND_URL must be available at build time for client-side code
ARG VITE_BACKEND_URL=https://api.jevansa.com.pe
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npx vite build

# ── Stage 3: Production runtime ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=builder /app/apps/frontend/.output ./apps/frontend/.output
COPY apps/frontend/package.json ./apps/frontend/package.json

WORKDIR /app/apps/frontend

# Server-side env — set at runtime via docker-compose
ENV VITE_BACKEND_URL=https://api.jevansa.com.pe

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
