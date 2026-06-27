# F4 — SQLite + Drizzle setup

**Phase:** 0 — Foundation (sequential). **Depends on:** F1, F3 (env).

**Goal:** A Drizzle client wired to a local SQLite file via `better-sqlite3`, drizzle-kit
configured for migrations, and a programmatic migrate runner. No tables yet (that's F5).

> No Docker, no Postgres, no connection pool, no SSL. The database is one file under `data/`.

## Tasks

- [ ] Deps: `drizzle-orm`, `better-sqlite3`; dev: `drizzle-kit`, `@types/better-sqlite3`.
- [ ] `src/server/db/client.ts`:
  - Derive the file path from `env.DATABASE_URL` by stripping a leading `file:` (`file:./data/sweet-potato.db` → `./data/sweet-potato.db`). Ensure the parent dir exists.
  - `const sqlite = new Database(dbPath);`
  - **`sqlite.pragma('journal_mode = WAL');`** (concurrency) and **`sqlite.pragma('foreign_keys = ON');`** (SQLite defaults FKs **off** — required for the cascade deletes in F5).
  - `export const db = drizzle(sqlite, { schema });` and `export const sqlite` (for graceful close in F3's shutdown handler).
- [ ] `src/server/db/migrate.ts`: programmatic runner — `migrate(db, { migrationsFolder })` from `drizzle-orm/better-sqlite3/migrator`. Used by `db:migrate` and by the container start command (G3). Resolve the migrations folder relative to `import.meta.dirname` so it works from `dist/` too.
- [ ] `drizzle.config.ts`: `dialect: "sqlite"`, `schema: "./src/server/db/schema.ts"`, `out: "./src/server/db/migrations"`, `dbCredentials: { url: <db file path> }`.
- [ ] npm scripts: `db:generate` (`drizzle-kit generate`), `db:migrate` (`tsx src/server/db/migrate.ts`), `db:studio` (`drizzle-kit studio`). (No `db:up`/`db:down` — there's no DB server.)
- [ ] Close `sqlite` in the server's graceful-shutdown handler (from F3).

## Files created

- `drizzle.config.ts`
- `src/server/db/client.ts`, `src/server/db/migrate.ts`
- updated `package.json` scripts

## Acceptance criteria

- Importing `db` opens/creates `data/sweet-potato.db` without error; WAL + FK pragmas are on.
- `pnpm db:migrate` runs (no-op until F5 adds migrations).

## How to verify

```bash
node -e "const D=require('better-sqlite3'); const d=new D('data/sweet-potato.db'); console.log(d.pragma('journal_mode'), d.pragma('foreign_keys'));"
# -> [ { journal_mode: 'wal' } ] [ { foreign_keys: 1 } ]   (after client.ts has opened it once)
```
