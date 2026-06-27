# F1 — Project scaffold

**Phase:** 0 — Foundation (sequential). **Depends on:** nothing.

**Goal:** A clean pnpm + TypeScript (strict, ESM) skeleton with linting, formatting, git, and
the folder layout from `00-overview.md` — nothing running yet.

## Tasks

- [ ] `pnpm init`; set `"type": "module"`, `"engines": { "node": ">=24" }`, name `sweet-potato`, `"private": true`.
- [ ] Dev deps: `typescript`, `tsx`, `@types/node`, `eslint`, `@typescript-eslint/*`, `eslint-config-prettier`, `prettier`. (Vite/Vitest/Drizzle/Fastify deps are added by the steps that introduce them.)
- [ ] `tsconfig.json`: `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ES2022"`, `outDir: "dist"`, `rootDir: "src"`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.
- [ ] `.eslintrc.cjs` (TS + prettier); `.prettierrc` (2-space, single quotes, trailing commas).
- [ ] `.gitignore`: `node_modules`, `dist`, `public`, `.env`, `*.log`, `.DS_Store`, `scripts/data/`, **`data/`** (the SQLite db file lives here), `coverage/`.
- [ ] `.env.example` with every var from `00-overview.md` (placeholder values, no secrets). `DATABASE_URL=file:./data/sweet-potato.db`.
- [ ] Folder skeleton: `src/server/{plugins,routes,db,lib,views/{layouts,pages,partials}}`, `src/client/{components,styles/lanes}`, `scripts/`, `tests/`, `data/` (with `.gitkeep`), `public/`.
- [ ] `git init`; first commit `chore: scaffold`. New repo defaults to **private**.
- [ ] Placeholder npm scripts (filled in by later steps): `lint`, `format`, `typecheck`.

## Files created

- `package.json`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.env.example`
- Folder skeleton (with `.gitkeep` where needed, incl. `data/.gitkeep`)

## Acceptance criteria

- `pnpm lint` and `pnpm typecheck` run with zero source files and exit 0 (or no-op cleanly).
- `git status` clean after the initial commit; `.env` and `data/` are ignored.

## How to verify

```bash
pnpm install && pnpm typecheck && pnpm lint   # all exit 0
git log --oneline                             # one commit
git check-ignore data/sweet-potato.db .env    # both ignored
```
