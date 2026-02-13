FROM node:22-alpine AS base
WORKDIR /app

# ── Install deps (monorepo root lockfile) ──
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci

# ── Build ──
FROM base AS build
COPY --from=deps /app ./
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN npm run build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/apps/frontend/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
