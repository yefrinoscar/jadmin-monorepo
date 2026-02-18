# Deployment Guide — jadmin

## Architecture

```
VPS (Hetzner)
├── ~/apps/strapi/           # Existing: Strapi + strapiDB + Caddy (ports 80/443)
│   └── docker-compose.yml
└── ~/apps/jadmin/           # This repo
    ├── docker-compose.yml   # jadmindb + backend + frontend
    └── .env                 # Production secrets
```

**Services:**
| Service | Image | Internal Port | Domain |
|---------|-------|---------------|--------|
| `jadmindb` | postgres:16-alpine | 5432 | — (internal only) |
| `backend` | Node.js 22 | 8080 | `api.jevansa.com.pe` |
| `frontend` | Node.js 22 (Nitro) | 3000 | `dashboard.jevansa.com.pe` |

Caddy (running in the strapi stack) handles HTTPS/TLS and reverse-proxies to jadmin services via the shared `web` Docker network.

---

## Prerequisites

- Docker & Docker Compose installed on VPS
- Caddy already running in `~/apps/strapi/`
- DNS records pointing to VPS IP:
  - `dashboard.jevansa.com.pe` → VPS IP
  - `api.jevansa.com.pe` → VPS IP

---

## One-Time VPS Setup

### 1. Create the shared Docker network

```bash
docker network inspect web >/dev/null 2>&1 || docker network create web
```

### 2. Update Strapi's docker-compose.yml

Add the `web` external network to the **caddy** service:

```yaml
services:
  caddy:
    # ... existing config ...
    networks:
      - default
      - web

networks:
  web:
    external: true
```

Then restart:

```bash
cd ~/apps/strapi
docker compose up -d
```

### 3. Update Caddyfile

Your Caddyfile should already have (from screenshot):

```
cms.jevansa.com.pe {
    reverse_proxy strapi:1337
}
dashboard.jevansa.com.pe {
    reverse_proxy frontend:3000
}
api.jevansa.com.pe {
    reverse_proxy backend:8080
}
```

Restart Caddy after changes:

```bash
cd ~/apps/strapi
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 4. Clone the repo and configure env

```bash
mkdir -p ~/apps/jadmin
cd ~/apps/jadmin
git clone https://github.com/YOUR_USER/jadmin-monorepo.git .
cp .env.example .env
nano .env  # Fill in real values
```

Generate a strong secret:

```bash
openssl rand -base64 32  # Use this for BETTER_AUTH_SECRET
```

### 5. First deploy

```bash
cd ~/apps/jadmin
docker compose build
docker compose up -d
docker compose exec backend npx drizzle-kit migrate
```

### 6. Verify

```bash
docker compose ps          # All services should be "Up"
docker compose logs -f     # Check for errors
curl http://localhost:8080/health  # Backend health check
```

---

## GitHub Actions (CI/CD)

Every push to `main` triggers automatic deployment.

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | Your Hetzner VPS IP address |
| `VPS_USER` | `root` (or your SSH user) |
| `VPS_SSH_KEY` | Private SSH key (paste full content including BEGIN/END lines) |

### How it works

1. Push to `main` branch
2. GitHub Actions SSHs into VPS
3. Pulls latest code (`git reset --hard origin/main`)
4. Builds Docker images on VPS
5. Restarts containers with new images
6. Runs DB migrations
7. Prunes old images

---

## Useful Commands

```bash
cd ~/apps/jadmin

# View logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f jadmindb

# Restart a single service
docker compose restart backend

# Rebuild and restart
docker compose build backend
docker compose up -d backend

# Access DB directly
docker compose exec jadmindb psql -U jadmin -d jadmin

# Run migrations manually
docker compose exec backend npx drizzle-kit migrate

# Full rebuild (no cache)
docker compose build --no-cache
docker compose up -d --remove-orphans
```

---

## Environment Variables

### Backend (set in docker-compose.yml / .env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PGHOST` | ✓ | Set to `jadmindb` (Docker service name) |
| `PGDATABASE` | ✓ | Postgres database name |
| `PGUSER` | ✓ | Postgres user |
| `PGPASSWORD` | ✓ | Postgres password |
| `PGSSLMODE` | — | Set to `disable` in Docker |
| `BETTER_AUTH_SECRET` | ✓ | Auth encryption secret |
| `BETTER_AUTH_URL` | — | `https://api.jevansa.com.pe` |
| `FRONTEND_URL` | — | `https://dashboard.jevansa.com.pe` |
| `RESEND_API_KEY` | — | Email service API key |
| `MISTRAL_API_KEY` | — | AI service API key |

### Frontend (build arg + runtime)

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | `https://api.jevansa.com.pe` — baked into client JS at build time and used server-side at runtime |

---

## Local Development

For local dev, keep using your `.env` files with Neon DB:

```bash
# In your local .env (apps/backend/.env)
PGSSLMODE=require   # Neon requires SSL
```

In Docker production, `PGSSLMODE=disable` is set in `docker-compose.yml`.
