# Deploying jadmin to Hetzner VPS

This guide assumes you already have a VPS with Docker installed and a Strapi stack running at `~/apps/strapi/`.

## Prerequisites

- Docker & Docker Compose installed on VPS
- DNS A records pointing to your VPS IP:
  - `dashboard.jevansa.com.pe` → `<VPS_IP>`
  - `api.dashboard.jevansa.com.pe` → `<VPS_IP>`

---

## 1. Create shared Docker network (once)

```bash
docker network create web
```

## 2. Update existing Strapi stack

### `~/apps/strapi/docker-compose.yml`

Add the `web` external network to `strapi` and `caddy` services:

```yaml
services:
  strapiDB:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: strapi_user
      POSTGRES_PASSWORD: jevansa2026
      POSTGRES_DB: strapi_db
    volumes:
      - ./db_data:/var/lib/postgresql/data

  strapi:
    build: .
    restart: always
    expose:
      - '1337'
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: strapiDB
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi_db
      DATABASE_USERNAME: strapi_user
      DATABASE_PASSWORD: jevansa2026
      NODE_ENV: production
      APP_KEYS: 92cfa5f41b2a6260dc1f56452e2768c0753825297b6913e1ae6e0ee1142f5a26
      API_TOKEN_SALT: 2dea2b33c82e731e40b1245af2d6e5aca437deef6c6f43d918345034f307e2e5
      ADMIN_JWT_SECRET: R4cFZQJt7p8Y1A0sKXn6g5D2eHcM9LrVUEWmBqSiOaPv
      TRANSFER_TOKEN_SALT: K7w9sLQvE2R5XcBfH8D3ZJpA4N6mYtUu1r0iOWaCkqgVx
      JWT_SECRET: 585db0bed6279168299904c03e3de7225dd87ab8bb077f76b2fe444cc672d36d
    networks:
      - default
      - web

  caddy:
    image: caddy:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - strapi
    networks:
      - default
      - web

networks:
  web:
    external: true

volumes:
  caddy_data:
  caddy_config:
```

### `~/apps/strapi/Caddyfile`

```caddyfile
api.jevansa.com.pe {
    reverse_proxy strapi:1337
}

dashboard.jevansa.com.pe {
    reverse_proxy frontend:3000
}

api.dashboard.jevansa.com.pe {
    reverse_proxy backend:8080
}
```

Then restart the Strapi stack:

```bash
cd ~/apps/strapi
docker compose up -d
```

## 3. Deploy jadmin (GitHub Actions — recommended)

Pushes to `main` automatically deploy via `.github/workflows/deploy.yml`.

### One-time setup

1. **Add GitHub Secrets** in your repo → Settings → Secrets and variables → Actions:

   | Secret | Value |
   |--------|-------|
   | `VPS_HOST` | Your Hetzner VPS IP (e.g. `65.108.x.x`) |
   | `VPS_USER` | `root` (or your deploy user) |
   | `VPS_PASSWORD` | Your VPS SSH password |
   | `REPO_URL` | Your repo clone URL (e.g. `https://github.com/user/jadmin-monorepo.git`) |

2. **First deploy only** — SSH into the VPS and create the `.env`:

   ```bash
   mkdir -p ~/apps/jadmin
   cd ~/apps/jadmin
   # The workflow will clone the repo on first run, but .env must exist
   nano .env   # paste values from .env.example
   ```

3. **Push to `main`** — the workflow runs automatically. You can also trigger it manually from the Actions tab.

### Manual deploy (alternative)

```bash
cd ~/apps
git clone <your-repo-url> jadmin
cd jadmin

# Create .env from example and fill in real values
cp .env.example .env
nano .env

# Build and start
docker compose up -d --build

# Run database migrations
docker compose exec backend npx drizzle-kit push
```

## 4. Verify

- https://dashboard.jevansa.com.pe — Frontend
- https://api.dashboard.jevansa.com.pe/health — Backend health check
- wss://api.dashboard.jevansa.com.pe — WebSocket

## Useful commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up -d --build

# Restart a single service
docker compose restart backend

# Run drizzle studio (for debugging)
docker compose exec backend npx drizzle-kit studio
```
