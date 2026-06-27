# F2 — Build tooling (Vite + Sass + Alpine + Vitest)

**Phase:** 0 — Foundation (sequential). **Depends on:** F1.

**Goal:** Vite compiles the client bundle + SCSS into `public/` with HMR in dev; Vitest is the
test harness for the whole project. Establish the dev/build/start/test npm scripts.

## Tasks

- [ ] Deps: `vite`, `sass`, `alpinejs`. Dev: `vitest`, `@vitest/coverage-v8`, `concurrently` (or `npm-run-all`), `@types/alpinejs` if needed.
- [ ] `vite.config.ts`: root `src/client`, `build.outDir: "../../public"`, `build.emptyOutDir: true`, `build.manifest: true`, single entry `main.ts`.
- [ ] `src/client/main.ts`: import Alpine, import `./styles/main.scss`, register components (stubs for now), `Alpine.start()`.
- [ ] `src/client/styles/main.scss`: `@use` tokens/themes/components + the `lanes/*` partials (all created in F6 — empty stubs so the build succeeds).
- [ ] `vitest.config.ts`: Node environment for server/lib/script tests; `jsdom` (add `jsdom` dev dep) or `happy-dom` for any client-store tests; `tests/**/*.test.ts` glob; coverage via v8.
- [ ] **Dev strategy:** Vite dev server (HMR) runs *alongside* Fastify. In dev the Eta layout points `<script>`/`<link>` at `http://localhost:5173`; in prod it reads `public/.vite/manifest.json`. The `lib/assets.ts` helper (F3) switches by `NODE_ENV`.
- [ ] npm scripts:
  - `dev`: run Vite + `tsx watch src/server/index.ts` concurrently.
  - `dev:client` / `dev:server`: split scripts.
  - `build`: `vite build && tsc -p tsconfig.json` (+ copy Eta/SQL assets to `dist/` — see F3/F4).
  - `start`: `node dist/server/index.js`.
  - `test`: `vitest run`. `test:watch`: `vitest`. `typecheck`: `tsc --noEmit`.

## Files created

- `vite.config.ts`, `vitest.config.ts`
- `src/client/main.ts`, `src/client/styles/main.scss` (stub)
- updated `package.json` scripts

## Acceptance criteria

- `pnpm build` produces `public/.vite/manifest.json` + hashed `assets/*.js`/`*.css`.
- `pnpm dev:client` serves the bundle with HMR at `:5173`.
- `pnpm test` runs Vitest green (no specs yet = exits 0).

## How to verify

```bash
pnpm build && ls public/assets && cat public/.vite/manifest.json
pnpm test         # 0 tests, exits 0
pnpm dev:client   # open the Vite URL, confirm it loads
```
