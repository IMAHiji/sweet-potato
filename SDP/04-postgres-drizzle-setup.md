# Step 04 — Postgres + Drizzle setup

**Goal:** A local Postgres (via Docker), a Drizzle client wired to `DATABASE_URL`,
and drizzle-kit configured for migrations. No tables yet (that's step 05).

**Depends on:** 01, 03 (env).

## Tasks

- [ ] Add deps: `drizzle-orm`, `pg`; dev: `drizzle-kit`, `@types/pg`.
- [ ] `docker-compose.yml`: one `postgres:16` service, named volume, healthcheck, ports `5432:5432`, env `POSTGRES_USER/PASSWORD/DB=sweet_potato`. Default local `DATABASE_URL=postgres://postgres:postgres@localhost:5432/sweet_potato`.
- [ ] `src/server/db/client.ts`: create a `pg` `Pool` from `env.DATABASE_URL`, wrap with `drizzle(pool, { schema })`, export `db` and `pool`. SSL on when `NODE_ENV=production` (Railway/Render require it).
- [ ] `drizzle.config.ts`: `dialect: "postgresql"`, `schema: "./src/server/db/schema.ts"`, `out: "./src/server/db/migrations"`, `dbCredentials` from `DATABASE_URL`.
- [ ] npm scripts: `db:up` (`docker compose up -d`), `db:down`, `db:generate` (`drizzle-kit generate`), `db:migrate` (`drizzle-kit migrate`), `db:studio` (`drizzle-kit studio`).
- [ ] Close the pool in the server's graceful-shutdown handler (from step 03).

## Files created

- `docker-compose.yml`, `drizzle.config.ts`
- `src/server/db/client.ts`
- updated `package.json` scripts

## Acceptance criteria

- `pnpm db:up` brings Postgres up healthy; `psql $DATABASE_URL -c '\l'` connects.
- Importing `db` in a script connects without error (verified fully in step 05).

## How to verify

```bash
pnpm db:up
docker compose ps          # postgres healthy
pg_isready -h localhost -p 5432   # accepting connections
```
