FROM node:22-bookworm-slim AS base
WORKDIR /app

# ── Install all deps (monorepo root lockfile) ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci

# ── Build ──
FROM base AS build
COPY --from=deps /app ./
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npm run build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy built output + package.json
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./

# Copy hoisted node_modules (all deps live here in npm workspaces)
COPY --from=deps /app/node_modules ./node_modules

# Copy drizzle config + schema for migrations
COPY --from=build /app/apps/backend/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/backend/src/db ./src/db

EXPOSE 8080
CMD ["node", "dist/index.js"]
