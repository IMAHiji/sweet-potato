# Step 01 — Project scaffold

**Goal:** A clean pnpm + TypeScript (strict, ESM) project skeleton with linting,
formatting, git, and the folder layout from `00-overview.md` — nothing running yet.

**Depends on:** nothing.

## Tasks

- [ ] `pnpm init`; set `"type": "module"`, `"engines": { "node": ">=24" }`, package name `sweet-potato`, `"private": true`.
- [ ] Add dev deps: `typescript`, `tsx`, `@types/node`, `eslint`, `@typescript-eslint/*`, `eslint-config-prettier`, `prettier`.
- [ ] `tsconfig.json`: `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ES2022"`, `outDir: "dist"`, `rootDir: "src"`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.
- [ ] `.eslintrc.cjs` with TS + prettier; `.prettierrc` (2-space, single quotes, trailing commas).
- [ ] `.gitignore`: `node_modules`, `dist`, `public`, `.env`, `*.log`, `.DS_Store`, `scripts/data/` (downloaded source files).
- [ ] `.env.example` with every var from `00-overview.md` (placeholder values, no secrets).
- [ ] Create empty folder skeleton: `src/server/{plugins,routes,db,lib,views}`, `src/client/{components,styles}`, `scripts/`, `public/`.
- [ ] `git init`; first commit `chore: scaffold`. New repo defaults to **private** (per global prefs).
- [ ] Add placeholder npm scripts (filled in by later steps): `lint`, `format`, `typecheck`.

## Files created

- `package.json`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.env.example`
- Folder skeleton (with `.gitkeep` where needed)

## Acceptance criteria

- `pnpm lint` and `pnpm typecheck` run with **zero** files yet and exit 0 (or no-op cleanly).
- `git status` is clean after the initial commit; `.env` is ignored.

## How to verify

```bash
pnpm install
pnpm typecheck   # exits 0
pnpm lint        # exits 0
git log --oneline   # one commit
```
