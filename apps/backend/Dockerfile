FROM node:22-alpine AS base
WORKDIR /app

# ── Install all deps (monorepo root lockfile) ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
RUN npm install --workspace=apps/backend --include-workspace-root

# ── Build ──
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY apps/backend ./apps/backend
WORKDIR /app/apps/backend
RUN npm run build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy built output
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy drizzle config + schema for migrations
COPY --from=build /app/apps/backend/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/apps/backend/src/db ./src/db

EXPOSE 8080
CMD ["node", "dist/index.js"]
