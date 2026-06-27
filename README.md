# 地瓜 (Sweet Potato) — Chinese Flashcard App

A flashcard app for learning Chinese characters (HSK 1–3). Supports traditional and simplified
script, Zhuyin (Bopomofo) and pinyin, Web Speech audio, spaced-repetition reviews, and an admin
CRUD panel. Runs on Node 24 + SQLite with no external database server.

## Tech stack

Node 24 · TypeScript · Fastify 5 · Drizzle ORM · SQLite (`better-sqlite3`) · Vite · Alpine.js · Sass · Eta (SSR templates) · Web Speech API

---

## Local development

### Prerequisites

- Node 24 LTS
- pnpm 10+ (`corepack enable`)

### Quickstart

```bash
git clone <repo>
cd sweet-potato

pnpm install

# Copy and fill in the required env vars
cp .env.example .env   # edit SESSION_SECRET + ADMIN_*/TEST_USER_* at minimum

# Apply migrations
pnpm db:migrate

# Seed (download HSK + CEDICT data, then seed the DB)
pnpm data:download
pnpm seed

# Start dev server (Vite HMR + tsx watch)
pnpm dev
# → http://localhost:3000
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SESSION_SECRET` | ✓ | — | ≥32-char random string. `openssl rand -hex 32` |
| `ADMIN_EMAIL` | ✓ | — | Email for the seeded admin account |
| `ADMIN_PASSWORD` | ✓ | — | Password for the admin account (min 8 chars) |
| `TEST_USER_EMAIL` | ✓ | — | Email for the seeded regular user |
| `TEST_USER_PASSWORD` | ✓ | — | Password for the test user |
| `DATABASE_URL` | — | `file:./data/sweet-potato.db` | SQLite file path (`file:` prefix) |
| `PORT` | — | `3000` | HTTP port |
| `NODE_ENV` | — | `development` | `development` / `production` |
| `HSK_LEVELS` | — | `1-3` | Range to seed: `1-3`, `1-7`, `4`, etc. |

### Useful scripts

```bash
pnpm typecheck      # TypeScript (server + client)
pnpm lint           # ESLint
pnpm test           # Vitest
pnpm build          # Production build (Vite + tsc + copy assets)
pnpm db:migrate     # Apply pending migrations
pnpm db:studio      # Drizzle Studio (DB browser)
pnpm data:download  # Download HSK + CC-CEDICT source data
pnpm seed           # Seed characters + admin/test users
pnpm seed:dev       # Quick dev fixture (small data set)
```

---

## Deploy (Docker + persistent volume)

The SQLite file must live on a **persistent volume** — not the container filesystem — or it is
wiped on redeploy.

### Build and run locally

```bash
docker build -t sweet-potato .

docker run --rm \
  -v sp_data:/data \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=changeme123 \
  -e TEST_USER_EMAIL=user@example.com \
  -e TEST_USER_PASSWORD=changeme123 \
  -p 3000:3000 \
  sweet-potato

# → http://localhost:3000/healthz  (should return {"ok":true})
```

Migrations run automatically on every container start. To seed after the first deploy, open a
one-off shell on the host:

```bash
# run seed inside a temporary container on the same volume
docker run --rm -v sp_data:/data \
  -e DATABASE_URL=file:/data/sweet-potato.db \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD=changeme123 \
  -e TEST_USER_EMAIL=user@example.com \
  -e TEST_USER_PASSWORD=changeme123 \
  -e SESSION_SECRET=placeholder \
  sweet-potato \
  sh -c "node -e \"import('./dist/server/env.js')\" && node_modules/.bin/tsx scripts/seed.ts"
```

### Volume persistence per platform

| Platform | Volume config |
|---|---|
| **Fly.io** | `fly volumes create sp_data --size 1` · `[mounts] source = "sp_data", destination = "/data"` in `fly.toml` |
| **Render** | Add a Persistent Disk mounted at `/data` in the service settings |
| **Railway** | Add a Volume mounted at `/data` in the service settings |

### Prod hardening checklist

- [ ] `SESSION_SECRET` is a random 32+ byte hex string (never the dev value)
- [ ] `NODE_ENV=production` (enables secure cookies, removes dev logging noise)
- [ ] Volume confirmed mounted: `docker exec <ctr> ls /data` shows `sweet-potato.db`
- [ ] `/healthz` returns `{"ok":true}` after start
- [ ] `trustProxy` — Fastify sets this automatically in production if you set `TRUST_PROXY=1`

---

## Project structure

```
src/
  server/
    index.ts          # Fastify bootstrap (autoload plugins + routes)
    env.ts            # Zod-validated environment
    db/
      schema.ts       # Drizzle schema (characters, users, reviews, sentences)
      client.ts       # SQLite + Drizzle client
      migrate.ts      # Migration runner
    plugins/          # session, auth, view (autoloaded)
    routes/           # characters, study, api, admin, auth, public (autoloaded)
    views/            # Eta SSR templates
    lib/
      pinyin.ts       # stripTones() for toneless search
      zhuyin.ts       # pinyinToZhuyin() Bopomofo conversion
      password.ts     # scrypt hash + verify
  client/
    main.ts           # Alpine.js entry — registers all stores/components
    components/       # theme, toggles, audio, flashcard, admin-forms
    styles/           # Sass (main + lane partials)
scripts/
  seed.ts             # HSK character + user seed
  download-data.ts    # Fetches HSK JSON + CC-CEDICT
tests/                # Vitest specs for all lanes
```
