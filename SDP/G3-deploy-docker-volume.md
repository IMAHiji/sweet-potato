# G3 — Deploy (portable Docker + persistent volume)

**Phase:** 2 — Integration (sequential). **Depends on:** a working app (G1–G2).

**Goal:** A portable container that runs migrations on start and keeps the SQLite file on a
**persistent volume**, so data survives redeploys. Host-agnostic (Fly / Render / Railway later).

> The one real cost of SQLite: the `.db` file must live on durable storage. On an ephemeral
> container filesystem it is wiped on redeploy. The volume below is what makes it safe.

## Tasks

- [ ] **Dockerfile** (multi-stage): builder runs `pnpm install` + `pnpm build` (Vite assets +
  `tsc` + copy `.eta`/migrations into `dist/`). Runner = slim Node 24 with prod deps only,
  `public/`, `dist/`. **`better-sqlite3` is a native module** — make sure the runner's
  platform/glibc matches the builder (build native deps in the runner stage, or use the same
  base image), or it won't load.
  - `ENV DATABASE_URL=file:/data/sweet-potato.db` → points at the mounted volume.
  - `CMD` runs migrations then starts: `node dist/server/db/migrate.js && node dist/server/index.js`.
  - `EXPOSE` the port; `HEALTHCHECK` → `/healthz`. Create `/data` and declare `VOLUME /data`.
- [ ] **`.dockerignore`**: `node_modules`, `.git`, `scripts/data`, `data`, `.env`, `SDP`, `coverage`.
- [ ] **Volume wiring per host** (document in README, pick at deploy time): Fly.io `fly volume` mounted at `/data`; Render persistent disk at `/data`; Railway volume at `/data`. The image is identical; only the volume mount differs.
- [ ] **Seeding in prod:** run `pnpm seed` once via the platform's one-off shell/job. Migrations run every deploy; **seeding is manual/one-off** (don't auto-seed).
- [ ] **`README.md`:** local quickstart (`install → db:migrate → seed:dev/seed → dev`) + deploy
  steps + the env-var table. No Postgres/Docker-compose DB instructions (there is no DB server).
- [ ] **Prod hardening:** `secure` cookies on, `trustProxy` set, `NODE_ENV=production`, strong
  `SESSION_SECRET`, the `/data` volume confirmed mounted (a smoke check that the file persists).

## Files created

- `Dockerfile`, `.dockerignore`, `README.md` (`src/server/db/migrate.ts` already exists from F4)

## Acceptance criteria

- `docker build .` succeeds; container boots, runs migrations, serves `/healthz`.
- The SQLite file is created on the mounted volume and **survives a container restart**.
- README takes a fresh clone to a running local app and a live deploy.

## How to verify

```bash
docker build -t sweet-potato .
docker run --rm -v sp_data:/data -e SESSION_SECRET=$(openssl rand -hex 32) -p 3000:3000 sweet-potato
curl -s localhost:3000/healthz                 # {"ok":true} after migrations
# Restart the container with the same -v sp_data:/data → data is still there.
```
