# Step 03 — Fastify server bootstrap

**Goal:** A running Fastify server that renders an Eta layout, serves built static
assets, has a health check, validated env, and centralized error handling.

**Depends on:** 01, 02.

## Tasks

- [ ] Add deps: `fastify`, `@fastify/view`, `eta`, `@fastify/static`, `@fastify/formbody` (parse HTML form posts), `zod`.
- [ ] `src/server/env.ts`: load + validate env with Zod (`DATABASE_URL`, `SESSION_SECRET`, `PORT`, `NODE_ENV`, seed creds, `HSK_LEVELS`). Throw on missing required vars at boot. Load `.env` via `node --env-file` or `dotenv` in dev only.
- [ ] `src/server/index.ts`: build a Fastify instance with logger; register plugins; `listen` on `PORT` `0.0.0.0`; graceful shutdown on SIGTERM/SIGINT (close db pool + server).
- [ ] `src/server/plugins/view.ts`: register `@fastify/view` with Eta, `root: src/server/views`, layout support, expose `reply.render(page, data)` convention. Provide a shared `renderPage` helper that injects common locals (current user, theme, asset URLs).
- [ ] `src/server/plugins/static.ts`: register `@fastify/static` serving `public/` at `/assets` (prefix matches Vite output).
- [ ] `src/server/lib/assets.ts`: resolve script/style URLs — dev → Vite dev server; prod → `public/.vite/manifest.json`.
- [ ] `src/server/views/layouts/base.eta`: HTML skeleton, `<html data-theme>`, `<head>` with asset links, nav partial, `<body>` content slot, footer.
- [ ] `GET /` route → renders a placeholder home page through the layout.
- [ ] `GET /healthz` → `{ ok: true }` JSON (used by Railway/Render health checks).
- [ ] `setErrorHandler` → render a friendly error page (500) + log; `setNotFoundHandler` → 404 page.

## Files created

- `src/server/env.ts`, `src/server/index.ts`
- `src/server/plugins/view.ts`, `src/server/plugins/static.ts`
- `src/server/lib/assets.ts`
- `src/server/views/layouts/base.eta`, `src/server/views/pages/home.eta`, `views/pages/error.eta`, `views/pages/404.eta`
- `src/server/views/partials/nav.eta`

## Acceptance criteria

- `pnpm dev` serves `/` (rendered HTML with styles) and `/healthz` (JSON).
- Unknown route → styled 404; thrown error → styled 500; both logged.
- Missing required env var → server refuses to boot with a clear message.

## How to verify

```bash
pnpm dev
curl -s localhost:3000/healthz        # {"ok":true}
open http://localhost:3000            # home page renders with theme/styles
curl -s -o /dev/null -w "%{http_code}" localhost:3000/nope   # 404
```
