# Step 02 — Build tooling (Vite + Sass + Alpine bundle)

**Goal:** Vite compiles the client bundle (`src/client/main.ts`) and SCSS into
`public/`, with HMR in dev. Establish the dev/build/start npm scripts.

**Depends on:** 01.

## Tasks

- [ ] Add deps: `vite`, `sass`, `alpinejs`. Dev: `@types/alpinejs` (if needed).
- [ ] `vite.config.ts`: root `src/client`, `build.outDir: "../../public"`, `build.emptyOutDir: true`, `build.manifest: true` (so the server can resolve hashed asset names). Single entry `main.ts`.
- [ ] `src/client/main.ts`: import Alpine, import `./styles/main.scss`, register components (stubs for now), `Alpine.start()`.
- [ ] `src/client/styles/main.scss`: `@use` tokens/themes/components (files created in step 06; empty stubs for now so build succeeds).
- [ ] Dev strategy: run Vite dev server (HMR) **alongside** the Fastify server. In dev, the Eta layout points `<script>`/`<link>` at the Vite dev server (`http://localhost:5173`); in prod it reads `public/.vite/manifest.json`. Add a `client/assets.ts` helper (or template var) to switch by `NODE_ENV`. (Wired in step 03/06.)
- [ ] npm scripts:
  - `dev`: run Vite (`vite`) and the server (`tsx watch src/server/index.ts`) concurrently (use `concurrently` or `npm-run-all`).
  - `build`: `vite build && tsc -p tsconfig.json` (assets + server compile).
  - `start`: `node dist/server/index.js` (prod).
  - `dev:client` / `dev:server` split scripts for debugging.

## Files created

- `vite.config.ts`
- `src/client/main.ts`, `src/client/styles/main.scss` (stub)
- updated `package.json` scripts

## Acceptance criteria

- `pnpm build` produces `public/.vite/manifest.json` + hashed `assets/*.js`/`*.css`.
- `pnpm dev:client` serves the bundle with HMR at `:5173`.

## How to verify

```bash
pnpm build && ls public/assets && cat public/.vite/manifest.json
pnpm dev:client   # open the Vite URL, confirm it loads
```
