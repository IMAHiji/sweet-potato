# F3 — Fastify server bootstrap (+ route autoload)

**Phase:** 0 — Foundation (sequential). **Depends on:** F1, F2.

**Goal:** A running Fastify server that renders an Eta layout, serves built static assets,
**auto-loads route files**, has a health check, validated env, and centralized error handling.

> The autoload setup here is what lets parallel lanes drop in route files without editing
> `index.ts`. It is the single most important collision-proofing decision — get it right.

## Tasks

- [ ] Deps: `fastify`, `@fastify/view`, `eta`, `@fastify/static`, `@fastify/formbody`, `@fastify/autoload`, `zod`.
- [ ] `src/server/env.ts`: load + validate env with Zod (`DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, seed creds, `HSK_LEVELS`). Throw on missing required vars at boot. Load `.env` via `node --env-file` / `tsx` in dev.
- [ ] `src/server/index.ts`: build a Fastify instance with logger; register plugins **in order** (view → static → session → auth → formbody), then `@fastify/autoload` over `./routes`; `listen` on `PORT` `0.0.0.0`; graceful shutdown on SIGTERM/SIGINT (close the SQLite connection from F4 + the server).
- [ ] `@fastify/autoload`: point at `src/server/routes/`. Convention: each route module
  `export default async function (app: FastifyInstance) { ... }`. Adding a route = adding a file.
- [ ] `src/server/plugins/view.ts`: register `@fastify/view` with Eta, `root: src/server/views`, layout support. Provide `reply.renderPage(page, data)` (decorator) that injects common locals: `currentUser` (F7), `theme`, asset URLs (`lib/assets.ts`).
- [ ] `src/server/plugins/static.ts`: register `@fastify/static` serving `public/` at `/assets` (matches Vite output).
- [ ] `src/server/lib/assets.ts`: resolve script/style URLs — dev → Vite dev server; prod → `public/.vite/manifest.json`.
- [ ] `src/server/views/layouts/base.eta`: HTML skeleton, `<html data-theme>`, `<head>` with asset links, nav partial slot, content slot, footer. (Theming + nav details land in F6.)
- [ ] `GET /` → placeholder home page through the layout. `GET /healthz` → `{ ok: true }` JSON.
- [ ] `setErrorHandler` → styled 500 page + log; `setNotFoundHandler` → styled 404 page.
- [ ] **Asset copy for prod:** `tsc` only emits `.js`; add a small `scripts/copy-server-assets.mjs` (run in `build`) to copy `views/**/*.eta` and `db/migrations/**` into `dist/`. Prod resolves views via `import.meta.dirname`.

## Files created

- `src/server/env.ts`, `src/server/index.ts`
- `src/server/plugins/view.ts`, `src/server/plugins/static.ts`
- `src/server/lib/assets.ts`
- `src/server/views/layouts/base.eta`, `views/pages/{home,error,404}.eta`, `views/partials/nav.eta` (minimal; F6 enriches)
- `scripts/copy-server-assets.mjs`

## Acceptance criteria

- `pnpm dev` serves `/` (rendered HTML) and `/healthz` (JSON).
- Unknown route → styled 404; thrown error → styled 500; both logged.
- Missing required env var → server refuses to boot with a clear message.
- A throwaway file `routes/ping.ts` exporting a `GET /ping` is picked up **without editing `index.ts`** (then delete it).

## How to verify

```bash
pnpm dev
curl -s localhost:3000/healthz                                   # {"ok":true}
open http://localhost:3000                                       # home renders
curl -s -o /dev/null -w "%{http_code}" localhost:3000/nope       # 404
```
