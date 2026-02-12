# jadmin - Monorepo

Admin panel monorepo powered by **Turborepo** with npm workspaces.

## Structure

```
jadmin-monorepo/
├── apps/
│   ├── frontend/   # TanStack Start + React + tRPC + Drizzle + Better Auth
│   └── backend/    # Bun WebSocket server
├── packages/       # Shared packages (future)
├── turbo.json      # Turborepo configuration
└── package.json    # Root workspace config
```

## Tech Stack

### Frontend (`apps/frontend`)
- **Framework**: [TanStack Start](https://tanstack.com/start) (SSR React)
- **Router**: [TanStack Router](https://tanstack.com/router) (file-based)
- **API**: [tRPC](https://trpc.io) v11
- **Auth**: [Better Auth](https://www.better-auth.com)
- **Database**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com)
- **Validation**: [Zod](https://zod.dev) v4
- **Linting**: [Biome](https://biomejs.dev)
- **Email**: [Resend](https://resend.com)

### Backend (`apps/backend`)
- **Runtime**: [Bun](https://bun.sh)
- **WebSocket**: Bun native WebSocket server

## Prerequisites

- [Node.js](https://nodejs.org) >= 20
- [Bun](https://bun.sh) >= 1.0 (for the backend)
- PostgreSQL database

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp apps/frontend/.env.example apps/frontend/.env
   cp apps/backend/.env.example apps/backend/.env
   ```
   Fill in the values in each `.env` file.

3. **Push database schema** (first time):
   ```bash
   cd apps/frontend
   npm run db:push
   ```

4. **Run development servers**:
   ```bash
   npm run dev
   ```
   This starts both frontend (port 3000) and backend (port 8080) via Turborepo.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all apps |

### Frontend-specific (`apps/frontend`)

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run Drizzle migrations |
| `npm run db:push` | Push schema directly to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run test` | Run tests with Vitest |
| `npm run check` | Run Biome checks |
