# Step 15 — Deploy (Railway / Render) + Docker fallback

**Goal:** Ship to a managed host with a managed Postgres add-on, running migrations on
deploy. Include a portable Dockerfile and a README.

**Depends on:** everything (a working app).

## Tasks

- [ ] **Dockerfile** (multi-stage): builder installs deps + `pnpm build` (Vite assets + `tsc`); runner is a slim Node 24 image with only prod deps, `public/`, `dist/`, and migrations. `CMD` runs migrations then starts: `node dist/server/db/migrate.js && node dist/server/index.js` (add a tiny `migrate.ts` that runs drizzle migrations programmatically). Expose `PORT`. `HEALTHCHECK` → `/healthz`.
- [ ] **`.dockerignore`**: `node_modules`, `.git`, `scripts/data`, `.env`, `SDP`.
- [ ] **`render.yaml`** blueprint: a web service (Docker or native Node env) + a managed Postgres instance; wire `DATABASE_URL` from the DB; mark `SESSION_SECRET`/`ADMIN_*`/`TEST_USER_*` as `sync: false` (set in dashboard); health check path `/healthz`; release/start command runs migrations.
- [ ] **Railway notes** in README: create project → add PostgreSQL plugin → deploy repo → set env vars → migrations run on start. (Railway auto-detects Node; Dockerfile also works.)
- [ ] **Seeding in prod**: document running `pnpm seed` once via the platform's one-off shell/job (don't auto-seed on every deploy). Migrations DO run every deploy; seeding is manual/one-off.
- [ ] **`README.md`**: local quickstart (`db:up` → install → migrate → seed → dev) + deploy steps for Railway and Render + the full env-var table.
- [ ] Production hardening checklist: `secure` cookies on, SSL to Postgres, `trustProxy` set, `NODE_ENV=production`, strong `SESSION_SECRET`.

## Files created

- `Dockerfile`, `.dockerignore`, `render.yaml`
- `src/server/db/migrate.ts` (programmatic migrate runner)
- `README.md`

## Acceptance criteria

- `docker build .` succeeds; the image boots, runs migrations, serves `/healthz`.
- `render.yaml` is valid and provisions web + Postgres with env wired.
- README lets a fresh clone reach a running local app, and a live deploy, by following the steps.

## How to verify

```bash
docker build -t sweet-potato .
docker run --rm -e DATABASE_URL=... -e SESSION_SECRET=... -p 3000:3000 sweet-potato
curl -s localhost:3000/healthz     # {"ok":true} after migrations run
# Render: validate the blueprint in the dashboard; first deploy comes up green.
```
