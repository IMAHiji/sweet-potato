# Sweet Potato (地瓜) — Complete Development Plan

> Combined from all SDP files: 00-overview, 01-build-order, F1–F9, A1–A2, B1–B3, C1–C3, D1–D2, G1–G4.

---

# Part 1: Overview

## Sweet Potato (地瓜) — Master Feature Plan

A web app for studying Chinese characters: browse a graded character database,
see simplified + traditional forms with pinyin + zhuyin, **hear them pronounced**,
study with flashcards, and (as admin) edit entries and example sentences.

> **Status:** Greenfield rebuild. Build the app from scratch by working through this
> plan. The build is split into a sequential **foundation** and then **four parallel
> lanes** that independent agents can build at the same time — see the Build Order
> section, which is the map you follow when building.

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Database | **SQLite** (single file, `better-sqlite3` driver via Drizzle). No DB server, no Docker Postgres. (Plan moved Postgres → SQLite 2026-06-27.) |
| Audio | **In scope.** Pronunciation via the browser's free **Web Speech API** (`speechSynthesis`, native OS voices) — no subscription, no paid TTS. Architected behind a `Speaker` interface so a cloud TTS can swap in later. |
| Audio surface | 🔊 button on **character detail** (the character + each example sentence), **flashcards** (front character + optional auto-play on flip), and **every browse card**. |
| Deploy target | **Portable Docker + persistent volume** for the `.db` file. Host-agnostic (Fly / Render / Railway chosen later). No managed-DB add-on. |
| Testing | **Vitest.** Each lane ships with unit / light-integration tests so parallel work self-verifies before merge. |
| Example sentences | **Admin-entered only.** Schema + admin CRUD; nothing seeded. |
| Character seed | **HSK-graded subset, default HSK 1–3** (~600–900 chars). Level range is configurable. |
| First-build scope | The 8 requested features **+ flashcard study mode + audio**. No SRS scheduling yet. |

## Requested features → where they're built

| # | Feature | Step(s) |
|---|---------|---------|
| 1 | Admin login | F7 (auth + roles), C1–C3 (admin UI) |
| 2 | Database | F4 (SQLite setup), F5 (schema) |
| 3 | Test user login (non-admin) | F7 (seeded `user` role; blocked from `/admin`) |
| 4 | Downloadable character database | D1–D2 (HSK + CC-CEDICT seed script) |
| 5 | Simplified + traditional display | F5 (columns), A1/A2 (script toggle) |
| 6 | Pinyin + zhuyin for every character | F8 (zhuyin derivation), A1/A2 (notation toggle) |
| 7 | Admin can edit entries | C2 (character editor) |
| 8 | Entry shows char + pinyin + zhuyin + 1–2 example sentences | A2 (detail page), C3 (sentence CRUD) |
| + | Flashcard study mode | B1–B3 |
| + | **Audio pronunciation (Web Speech API)** | F9 (audio store + `Speaker`), wired into A1/A2/B2 |

## Stack

- **Node 24 LTS · TypeScript (strict) · ESM · pnpm**
- **Fastify** — web framework. One process serves SSR HTML + JSON API + built static assets (simplest to deploy). Routes auto-registered via `@fastify/autoload`.
- **Eta** templating via `@fastify/view` → server-rendered, mostly-static HTML.
- **Alpine.js** — client interactivity only (theme toggle, script/notation toggles, **audio**, flashcards, admin forms).
- **Vite + Sass** — asset bundling, HMR in dev, the two themes.
- **Drizzle ORM + SQLite** (`better-sqlite3` driver — synchronous, zero-network, single file).
- **Web Speech API** (`window.speechSynthesis`) — native browser voices for pronunciation; **no server, no subscription**.
- **`@fastify/secure-session`** — sealed-cookie sessions, no session table.
- **`crypto.scrypt`** (Node built-in) — password hashing, zero native deps.
- **Zod** — request body validation in admin/API routes.
- **Vitest** — unit + integration tests.

> **Why SQLite?** This app is read-heavy, single-process, and modest in size. A single
> `better-sqlite3` file removes the Postgres server, the Docker dependency, the connection
> pool, and SSL config — local dev is just `pnpm dev`. The one tradeoff is deployment: the
> `.db` file needs a **persistent volume** (handled in G3). WAL mode + `foreign_keys = ON`
> are set at connection time.

## Data model (Drizzle / SQLite)

SQLite types: `serial → integer pk autoincrement`, `timestamptz → integer({ mode: 'timestamp' })`,
text stays text. `foreign_keys = ON` (set per-connection in F4) makes the cascades below fire.

```
users
  id            integer pk autoincrement
  email         text unique not null
  password_hash text not null            -- scrypt: "<saltHex>:<hashHex>"
  role          text not null            -- 'admin' | 'user'  ($type union)
  display_name  text
  created_at    integer timestamp default (unixepoch())

characters
  id             integer pk autoincrement
  traditional    text not null unique
  simplified     text not null
  pinyin         text not null           -- tone-marked, e.g. "nǐ"
  pinyin_search  text not null           -- tone-stripped, lowercased, spaceless: "ni"  (fixes tone-sensitive search)
  zhuyin         text not null           -- e.g. "ㄋㄧˇ"
  definition     text not null
  hsk_level      integer                 -- nullable
  frequency_rank integer                 -- nullable
  created_at     integer timestamp default (unixepoch())
  updated_at     integer timestamp default (unixepoch())   -- app sets on update

example_sentences
  id           integer pk autoincrement
  character_id integer not null references characters(id) on delete cascade
  traditional  text not null
  simplified   text not null
  pinyin       text
  zhuyin       text
  translation  text not null
  notes        text
  sort_order   integer default 0
  created_at   integer timestamp default (unixepoch())
  updated_at   integer timestamp default (unixepoch())

reviews                                  -- append-only; SRS-ready, no scheduler yet
  id           integer pk autoincrement
  user_id      integer not null references users(id) on delete cascade
  character_id integer not null references characters(id) on delete cascade
  rating       text not null             -- 'known' | 'again'  ($type union)
  reviewed_at  integer timestamp default (unixepoch())
```

> **`pinyin_search`** is new vs. the old plan: it stores a tone-stripped, lowercased,
> space-free copy of the pinyin so searching `nihao` / `hao` matches `nǐ hǎo`. This fixes
> the tone-sensitive-search defect noted in the previous build. Populated by the seed (D2)
> and the admin editor (C2) via `stripTones()` in `lib/pinyin.ts` (F8).

## Routes

**Public**
- `GET /` — landing/home
- `GET /login` · `POST /login` · `POST /logout`
- `GET /healthz` — health check (used by the container)

**Authenticated (`user` or `admin`)**
- `GET /characters` — browse: search, HSK filter, pagination, script + notation toggles, 🔊
- `GET /characters/:id` — detail: character, pinyin, zhuyin, definition, example sentences, 🔊
- `GET /study` — flashcards (with 🔊 / auto-play)
- `POST /api/reviews` — log a flashcard review (JSON)

**Admin only (`admin`)**
- `GET /admin` — dashboard (counts)
- `GET /admin/characters` — list with edit/delete
- `GET /admin/characters/new` · `POST /admin/characters`
- `GET /admin/characters/:id/edit` · `POST /admin/characters/:id` · `POST /admin/characters/:id/delete`
- `POST /admin/characters/:id/sentences` · `POST /admin/sentences/:id` · `POST /admin/sentences/:id/delete`
- `POST /admin/derive-zhuyin` — helper used by the editor

> **Audio adds no routes.** It is 100% client-side (`speechSynthesis`). The `Speaker`
> interface (F9) is the seam where a future server/cloud TTS could add a `POST /api/tts`.

## Audio — native browser voices (Web Speech API)

- A client `audio` Alpine store wraps `window.speechSynthesis`, picks the best Chinese voice
  (prefer `zh-TW` → `zh-HK`/`zh` → `zh-CN` → `zh-SG`), and handles Chrome's async voice
  loading (`voiceschanged`).
- A reusable `🔊` button partial; the button is **hidden/disabled with a tooltip** when no
  Chinese voice is installed or `speechSynthesis` is unsupported.
- An **auto-play-on-flip** preference (persisted to `localStorage`) for study mode.
- Defined behind a `Speaker` interface so a paid cloud TTS (Azure / Google / ElevenLabs) can
  replace the Web Speech implementation without touching any call site.
- **Known limitations** (documented in G4): voice availability + quality vary by OS/browser;
  iOS Safari only speaks after a user gesture and may truncate long utterances.

## Theming — two themes, rounded UI

Switched by `data-theme` on `<html>`. Alpine toggle persists choice to `localStorage`;
on first visit, falls back to `prefers-color-scheme`.

- **Sunny (light/happy):** sweet-potato orange primary, cream paper bg, leaf-green accent, soft shadows.
- **Dark:** charcoal/aubergine bg, warm orange retained as accent, muted text.
- Shared design tokens (color / spacing / radius). Generous border-radius everywhere.
- **AA contrast required in both themes** (the prior build's sunny theme failed AA — use the
  AA-safe token values: primary `#b05828`, accent `#4f7a3d`, danger `#b8402f`, text-muted `#6f6052`).

## Project structure

```
package.json  tsconfig.json  .eslintrc.cjs  .prettierrc  .gitignore  .env.example
Dockerfile  .dockerignore  drizzle.config.ts  vite.config.ts  vitest.config.ts
data/                        # SQLite db file lives here (gitignored; volume-mounted in prod)
src/
  server/
    index.ts                 # Fastify bootstrap (autoloads routes/)
    env.ts                   # validated env loader
    plugins/                 # view, static, session, auth-guards
    routes/                  # auto-loaded: public, characters, study, api, admin
    db/                      # client.ts, migrate.ts, schema.ts, migrations/
    lib/                     # assets.ts, password.ts, pinyin.ts, zhuyin.ts
    views/                   # Eta: layouts/, pages/, partials/
  client/
    main.ts                  # Alpine init + component registration
    components/              # theme.ts, toggles.ts, audio.ts, flashcard.ts, admin-forms.ts
    styles/                  # tokens/themes/components/main.scss + lanes/_browse,_study,_admin.scss
scripts/
  download-data.ts  sources.ts  seed.ts  seed-dev.ts   # data + seeding
tests/                       # Vitest specs (one file per lane)
SDP/                         # this plan
```

## Build order (summary)

```
Phase 0 — FOUNDATION (sequential, one builder):
  F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9

Phase 1 — LANES (parallel; each depends ONLY on the foundation):
  ┌─ Lane A: A1 → A2        (browse + detail)
  ├─ Lane B: B1 → B2 → B3   (study + flashcards + reviews API)
  ├─ Lane C: C1 → C2 → C3   (admin dashboard + editor + sentences)
  └─ Lane D: D1 → D2        (data download + seed)

Phase 2 — INTEGRATION (sequential, one builder):
  G1 (merge) → G2 (seed real data) → G3 (deploy) → G4 (QA + audio pass)
```

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | SQLite file URL, default `file:./data/sweet-potato.db` |
| `SESSION_SECRET` | key for `@fastify/secure-session` (≥32 bytes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `PORT` | HTTP port (default 3000) |
| `NODE_ENV` | `development` / `production` |
| `HSK_LEVELS` | seed range, default `1-3` |

## Glossary

- **Pinyin** — romanization with tone marks (`nǐ hǎo`).
- **Zhuyin / Bopomofo** — phonetic symbols (`ㄋㄧˇ ㄏㄠˇ`), derived from pinyin in `lib/zhuyin.ts`.
- **Web Speech API** — browser-native speech synthesis (`window.speechSynthesis`); the free,
  no-subscription source of pronunciation audio for the first pass.
- **CC-CEDICT** — open Chinese-English dictionary; fallback source for definitions.
- **HSK** — standardized Chinese proficiency levels; defines the graded seed subset.

## Out of scope (next phase)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · **cloud/paid TTS** (the `Speaker` seam is ready for it, but the first pass is
Web Speech only).

---

# Part 2: Build Order & Parallelization

## The three phases

```
Phase 0 — FOUNDATION            Phase 1 — LANES (parallel)        Phase 2 — INTEGRATION
(sequential, one builder)       (4 agents, one per lane)          (sequential, one builder)

F1 scaffold                     ┌── Lane A (reading)              G1 merge + smoke test
F2 build tooling + Vitest       │     A1 browse                   G2 seed real data
F3 server + autoload            │     A2 detail                   G3 deploy (Docker+volume)
F4 sqlite + drizzle             ├── Lane B (study)                G4 QA + a11y + audio pass
F5 schema   ◄── TYPE CONTRACT   │     B1 study route
F6 theming + layout             │     B2 flashcard
F7 auth     ◄── AUTH CONTRACT   │     B3 reviews API
F8 phonetics lib + tests        ├── Lane C (admin)
F9 shared client primitives     │     C1 dashboard+list
   (toggles, audio) ◄─ UI       │     C2 editor
        CONTRACTS               │     C3 sentences
                                └── Lane D (data)
                                      D1 download
                                      D2 seed
```

**Rule:** No lane may start until **the entire foundation (F1–F9) is complete and the
foundation gate passes**. Every lane depends *only* on the foundation — never on
another lane. That is what makes them safe to run at the same time.

## Dependency graph

```
F1 → F2 → F3 → F4 → F5 ─┬─→ F6 ─┐
                        │       ├─→ F7 ──┐
                        │       │        ├─→ F9 ─┐
                        └───────┴── F8 ──┘        │
                                                  ▼
              (foundation gate) ──────────────────●
                                                  │
        ┌───────────────┬───────────────┬─────────┴───────┐
        ▼               ▼               ▼                 ▼
    Lane A          Lane B          Lane C            Lane D
   A1 → A2        B1 → B2 → B3    C1 → C2 → C3        D1 → D2
        └───────────────┴───────┬───────┴─────────────────┘
                                ▼
                        G1 → G2 → G3 → G4
```

- F6 (theming) and F8 (phonetics) only need F5; F7 needs F6; F9 needs F6+F7. The foundation is
  written as one sequential pass F1→F9 for simplicity, but F8 may be built any time after F5.
- **Lane data dependency:** A/B/C consume the DB *schema and types* (F5) and run against the
  **dev fixture** (`pnpm seed:dev`, created in F7) — they do **not** wait for Lane D. Real HSK
  data lands in G2.

## Foundation gate (must pass before any lane starts)

```bash
pnpm install
pnpm typecheck      # 0 errors
pnpm lint           # 0 errors
pnpm test           # F8 phonetics tests pass
pnpm build          # vite assets + tsc succeed
pnpm db:migrate     # schema applies to a fresh data/ db
pnpm seed:dev       # ~6 sample characters + 2 users inserted
pnpm dev            # / , /login work; log in as admin + test user; 🔊 button visible if a zh voice exists
```

If all green, the contracts the lanes build against are stable. Freeze the foundation files
(only touch them again for a deliberate, announced schema/contract change).

## File-ownership matrix

Parallel safety comes from **disjoint file ownership**. Each path below is written by exactly
one owner. Lanes **read** foundation files freely but **never edit** them — except the three
designated *stub* files they are explicitly told to fill.

| Owner | Files |
|-------|-------|
| **Foundation** | `package.json`, `pnpm-workspace.yaml`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts`, `drizzle.config.ts`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.dockerignore`, `.env.example` |
| **Foundation** | `src/server/index.ts`, `env.ts`, `types.ts` |
| **Foundation** | `src/server/plugins/{view,static,session,auth}.ts` |
| **Foundation** | `src/server/db/{client,migrate,schema}.ts`, `db/migrations/**` |
| **Foundation** | `src/server/lib/{assets,password,pinyin,zhuyin}.ts` |
| **Foundation** | `src/server/views/layouts/base.eta`; `views/partials/{nav,flash,empty-state,speak-button}.eta` |
| **Foundation** | `src/client/main.ts`; `components/{theme,toggles,audio}.ts`; `styles/{tokens,themes,components,main}.scss` |
| **Foundation** | `scripts/seed-users.ts` (shared seed helper), `scripts/seed-dev.ts` (dev fixture); the **stub** files below |
| **Lane A** | `src/server/routes/characters.ts`; `views/pages/{characters,character-detail}.eta`; `views/partials/{character-card,sentence-item}.eta`; **fills** `styles/lanes/_browse.scss` |
| **Lane B** | `src/server/routes/{study,api}.ts`; `views/pages/study.eta`; **fills** `components/flashcard.ts`; **fills** `styles/lanes/_study.scss` |
| **Lane C** | `src/server/routes/admin.ts`; `views/pages/admin/{dashboard,characters-list,character-form}.eta`; `views/partials/{admin-bar,sentence-fields}.eta`; **fills** `components/admin-forms.ts`; **fills** `styles/lanes/_admin.scss` |
| **Lane D** | `scripts/{download-data,sources,seed}.ts`; `scripts/data/README.md` |
| **Tests** | each lane writes `tests/<lane>.test.ts` (e.g. `tests/characters.test.ts`) — distinct filenames, no collisions |

### Stub-and-fill files (created empty by Foundation, filled by one lane)

| Stub created in | File | Filled by | Why a stub |
|-----------------|------|-----------|------------|
| F9 | `src/client/components/flashcard.ts` | Lane B | so `main.ts` can `import` + register it once |
| F9 | `src/client/components/admin-forms.ts` | Lane C | same |
| F6 | `src/client/styles/lanes/_browse.scss` | Lane A | so `main.scss` `@use`s it once |
| F6 | `src/client/styles/lanes/_study.scss` | Lane B | same |
| F6 | `src/client/styles/lanes/_admin.scss` | Lane C | same |

## Collision-proofing conventions (built into the foundation)

1. **Routes auto-register** — F3 registers `@fastify/autoload` over `src/server/routes/`. A new
   lane route is a file that `export default async (app) => { ... }`. **No edits to `index.ts`.**
   Each route file applies its own guard inside its plugin scope via the `app.requireUser` /
   `app.requireAdmin` decorators from F7.
2. **Nav links pre-stubbed** — F6's `nav.eta` already contains Browse `/characters`, Study
   `/study`, and a role-gated Admin `/admin` link, pointing at routes the lanes will create.
   **Lanes never touch `nav.eta`.**
3. **Alpine components stub-and-fill** — F9's `main.ts` imports and registers *all* components,
   including `flashcard` and `admin-forms` (empty stubs). Lanes fill their stub file only.
   **`main.ts` never changes after F9.**
4. **SCSS stub-and-fill** — F6's `main.scss` `@use`s `lanes/browse`, `lanes/study`,
   `lanes/admin` (empty partials). Lanes fill their partial. **`main.scss` never changes.**
5. **Shared component classes** (`.btn`, `.card`, `.grid`, `.flashcard`, `.badge`, `.input`,
   `.select`, `.toggle`, `.speak-btn`) are defined once in F6. Lane-specific styling goes in the
   lane's own `_*.scss` partial.
6. **Schema frozen at F5.** Lanes never alter `schema.ts` or generate migrations. A needed schema
   change is a deliberate foundation change, re-runs the gate, and is announced to all lanes.
7. **Dev fixture unblocks UI lanes** — `pnpm seed:dev` (F7) inserts 2 users + ~6 characters + 2
   sentences with pre-derived zhuyin, so Lanes A/B/C have data without waiting for Lane D.

## How to run the build

### Mode 1 — Parallel agents (fastest; the intended path)

1. **Foundation (you, on `main`):** build F1→F9 in order. Run the **foundation gate**. Commit.
2. **Launch lanes:** spawn four agents, each in its **own git worktree** (`isolation: worktree`).
   Give each agent: its lane's step files, this ownership matrix, and the instruction
   *"only create/modify the files your lane owns; consume foundation interfaces as documented;
   write `tests/<lane>.test.ts`; run `pnpm typecheck && pnpm lint && pnpm test` before reporting
   done."*
   - Agent A → A1 (browse), A2 (detail)
   - Agent B → B1 (study route), B2 (flashcard), B3 (reviews API)
   - Agent C → C1 (admin dashboard+list), C2 (editor), C3 (sentences)
   - Agent D → D1 (download), D2 (seed)
3. **Merge (you):** because the lanes touch **disjoint files**, merges are conflict-free by
   construction. Merge A, B, C, D back to `main`.
4. **Integration:** run G1→G4.

### Mode 2 — Sequential (solo fallback)

Build the foundation, then do the lanes one at a time in any order (A, B, C, D), then G1→G4.
Same files, same contracts — you just don't parallelize.

### What each lane can rely on from the foundation (the contracts)

- **Types:** `import type { Character, NewCharacter, ExampleSentence, User, Review } from '../db/schema.js'` (F5).
- **DB:** `import { db } from '../db/client.js'` (F4) — synchronous `better-sqlite3` + Drizzle.
- **Guards:** `app.requireUser`, `app.requireAdmin` decorators (F7).
- **Render:** `reply.renderPage('page', data)` — injects `currentUser`, `theme`, asset URLs (F3).
- **Current user:** `request.user` (`User | null`) and `currentUser` in every template (F7).
- **Display store:** `$store.display.script` (`'simplified'|'traditional'`) and
  `$store.display.notation` (`'pinyin'|'zhuyin'|'both'`), persisted (F9).
- **Audio store:** `$store.audio.available`, `$store.audio.speak(text)`,
  `$store.audio.autoPlay`; plus the `speak-button.eta` partial taking a `text` local (F9).
- **Phonetics:** `pinyinToZhuyin(pinyin)` and `stripTones(pinyin)` from `lib/`  (F8).
- **UI classes:** the rounded component classes listed in convention #5 (F6).
- **Dev data:** `pnpm seed:dev` for a working local DB (F7).

---

# Part 3: Foundation Steps (F1–F9)

---

## F1 — Project scaffold

**Phase:** 0 — Foundation (sequential). **Depends on:** nothing.

**Goal:** A clean pnpm + TypeScript (strict, ESM) skeleton with linting, formatting, git, and
the folder layout from the overview — nothing running yet.

### Tasks

- [ ] `pnpm init`; set `"type": "module"`, `"engines": { "node": ">=24" }`, name `sweet-potato`, `"private": true`.
- [ ] Dev deps: `typescript`, `tsx`, `@types/node`, `eslint`, `@typescript-eslint/*`, `eslint-config-prettier`, `prettier`. (Vite/Vitest/Drizzle/Fastify deps are added by the steps that introduce them.)
- [ ] `tsconfig.json`: `strict: true`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ES2022"`, `outDir: "dist"`, `rootDir: "src"`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`.
- [ ] `.eslintrc.cjs` (TS + prettier); `.prettierrc` (2-space, single quotes, trailing commas).
- [ ] `.gitignore`: `node_modules`, `dist`, `public`, `.env`, `*.log`, `.DS_Store`, `scripts/data/`, **`data/`** (the SQLite db file lives here), `coverage/`.
- [ ] `.env.example` with every var from the overview (placeholder values, no secrets). `DATABASE_URL=file:./data/sweet-potato.db`.
- [ ] Folder skeleton: `src/server/{plugins,routes,db,lib,views/{layouts,pages,partials}}`, `src/client/{components,styles/lanes}`, `scripts/`, `tests/`, `data/` (with `.gitkeep`), `public/`.
- [ ] `git init`; first commit `chore: scaffold`. New repo defaults to **private**.
- [ ] Placeholder npm scripts (filled in by later steps): `lint`, `format`, `typecheck`.

### Files created

- `package.json`, `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc`, `.gitignore`, `.env.example`
- Folder skeleton (with `.gitkeep` where needed, incl. `data/.gitkeep`)

### Acceptance criteria

- `pnpm lint` and `pnpm typecheck` run with zero source files and exit 0 (or no-op cleanly).
- `git status` clean after the initial commit; `.env` and `data/` are ignored.

### How to verify

```bash
pnpm install && pnpm typecheck && pnpm lint   # all exit 0
git log --oneline                             # one commit
git check-ignore data/sweet-potato.db .env    # both ignored
```

---

## F2 — Build tooling (Vite + Sass + Alpine + Vitest)

**Phase:** 0 — Foundation (sequential). **Depends on:** F1.

**Goal:** Vite compiles the client bundle + SCSS into `public/` with HMR in dev; Vitest is the
test harness for the whole project. Establish the dev/build/start/test npm scripts.

### Tasks

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

### Files created

- `vite.config.ts`, `vitest.config.ts`
- `src/client/main.ts`, `src/client/styles/main.scss` (stub)
- updated `package.json` scripts

### Acceptance criteria

- `pnpm build` produces `public/.vite/manifest.json` + hashed `assets/*.js`/`*.css`.
- `pnpm dev:client` serves the bundle with HMR at `:5173`.
- `pnpm test` runs Vitest green (no specs yet = exits 0).

### How to verify

```bash
pnpm build && ls public/assets && cat public/.vite/manifest.json
pnpm test         # 0 tests, exits 0
pnpm dev:client   # open the Vite URL, confirm it loads
```

---

## F3 — Fastify server bootstrap (+ route autoload)

**Phase:** 0 — Foundation (sequential). **Depends on:** F1, F2.

**Goal:** A running Fastify server that renders an Eta layout, serves built static assets,
**auto-loads route files**, has a health check, validated env, and centralized error handling.

> The autoload setup here is what lets parallel lanes drop in route files without editing
> `index.ts`. It is the single most important collision-proofing decision — get it right.

### Tasks

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

### Files created

- `src/server/env.ts`, `src/server/index.ts`
- `src/server/plugins/view.ts`, `src/server/plugins/static.ts`
- `src/server/lib/assets.ts`
- `src/server/views/layouts/base.eta`, `views/pages/{home,error,404}.eta`, `views/partials/nav.eta` (minimal; F6 enriches)
- `scripts/copy-server-assets.mjs`

### Acceptance criteria

- `pnpm dev` serves `/` (rendered HTML) and `/healthz` (JSON).
- Unknown route → styled 404; thrown error → styled 500; both logged.
- Missing required env var → server refuses to boot with a clear message.
- A throwaway file `routes/ping.ts` exporting a `GET /ping` is picked up **without editing `index.ts`** (then delete it).

### How to verify

```bash
pnpm dev
curl -s localhost:3000/healthz                                   # {"ok":true}
open http://localhost:3000                                       # home renders
curl -s -o /dev/null -w "%{http_code}" localhost:3000/nope       # 404
```

---

## F4 — SQLite + Drizzle setup

**Phase:** 0 — Foundation (sequential). **Depends on:** F1, F3 (env).

**Goal:** A Drizzle client wired to a local SQLite file via `better-sqlite3`, drizzle-kit
configured for migrations, and a programmatic migrate runner. No tables yet (that's F5).

> No Docker, no Postgres, no connection pool, no SSL. The database is one file under `data/`.

### Tasks

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

### Files created

- `drizzle.config.ts`
- `src/server/db/client.ts`, `src/server/db/migrate.ts`
- updated `package.json` scripts

### Acceptance criteria

- Importing `db` opens/creates `data/sweet-potato.db` without error; WAL + FK pragmas are on.
- `pnpm db:migrate` runs (no-op until F5 adds migrations).

### How to verify

```bash
node -e "const D=require('better-sqlite3'); const d=new D('data/sweet-potato.db'); console.log(d.pragma('journal_mode'), d.pragma('foreign_keys'));"
# -> [ { journal_mode: 'wal' } ] [ { foreign_keys: 1 } ]   (after client.ts has opened it once)
```

---

## F5 — Database schema + first migration ◄ TYPE CONTRACT

**Phase:** 0 — Foundation (sequential). **Depends on:** F4.

**Goal:** Define all tables in Drizzle (SQLite), export inferred types, generate and apply the
first migration. **This is the type contract every lane imports — freeze it after the gate.**

### Tasks

- [ ] `src/server/db/schema.ts` using `drizzle-orm/sqlite-core` — tables exactly as in the overview:
  - `users` — `id` integer pk autoincrement; `email` text unique not null; `passwordHash` text not null; `role` `text('role').$type<Role>()` not null; `displayName` text; `createdAt` `integer({ mode: 'timestamp' }).default(sql\`(unixepoch())\`)`.
  - `characters` — `traditional` text **unique** not null; `simplified`, `pinyin`, **`pinyinSearch`** (tone-stripped, lowercased, spaceless), `zhuyin`, `definition` all not null; `hskLevel` integer (nullable); `frequencyRank` integer (nullable); `createdAt`/`updatedAt` timestamps.
  - `example_sentences` — `characterId` integer not null `references(() => characters.id, { onDelete: 'cascade' })`; `traditional`, `simplified`, `translation` not null; `pinyin`, `zhuyin`, `notes` nullable; `sortOrder` integer default 0; timestamps.
  - `reviews` — `userId` + `characterId` both not null cascade FKs; `rating` `text().$type<Rating>()` not null; `reviewedAt` timestamp default now.
- [ ] Type unions + `$type`: `export type Role = 'admin' | 'user';` `export type Rating = 'known' | 'again';`
- [ ] Indexes (in each table's callback): `characters(hskLevel)`, `characters(simplified)`, `characters(pinyinSearch)`, `example_sentences(characterId)`, `reviews(userId, characterId)`.
- [ ] Export inferred types: `User`/`NewUser`, `Character`/`NewCharacter`, `ExampleSentence`/`NewExampleSentence`, `Review` via `$inferSelect` / `$inferInsert`.
- [ ] `pnpm db:generate` → review the generated SQL; `pnpm db:migrate` → apply to `data/sweet-potato.db`.

> **SQLite notes:** no `timestamptz` — use `integer({ mode: 'timestamp' })` (Drizzle maps to JS
> `Date`). `updatedAt` has no DB auto-update trigger; **set it in app code** on every update
> (C2/C3). `unique`/FK constraints need `foreign_keys = ON` (F4) to enforce cascades.

### Files created

- `src/server/db/schema.ts`
- `src/server/db/migrations/0000_*.sql` (generated)

### Acceptance criteria

- Migration applies cleanly to a fresh `data/` db; all four tables + indexes + FKs exist.
- Re-running `db:migrate` is a no-op (idempotent).
- Types import and compile (`pnpm typecheck`).

### How to verify

```bash
pnpm db:generate && pnpm db:migrate
sqlite3 data/sweet-potato.db '.tables'                 # users characters example_sentences reviews
sqlite3 data/sweet-potato.db '.schema characters'      # columns incl. pinyin_search, unique(traditional), indexes
pnpm typecheck
```

---

## F6 — Theming + base layout (Sunny + Dark, rounded UI)

**Phase:** 0 — Foundation (sequential). **Depends on:** F3 (layout/render), F2 (SCSS pipeline).

**Goal:** A polished base layout with two AA-contrast themes, a working theme toggle, the
reusable rounded UI components every lane uses, the shared partials, and the **pre-stubbed nav
+ per-lane SCSS stubs** that keep lanes from editing shared files.

### Tasks

- [ ] `styles/tokens.scss`: design tokens as CSS custom properties under `:root` — spacing scale, radii (`--radius-sm/md/lg/pill`), shadows, font stacks (CJK-friendly: `"Noto Sans TC", "PingFang TC", system-ui`), font sizes incl. a large `--fs-char` for the big character.
- [ ] `styles/themes.scss`: color tokens for `[data-theme="sunny"]` and `[data-theme="dark"]`.
  - **Sunny (AA-safe):** `--bg #FFF8F0`, `--surface #FFFFFF`, `--primary #b05828`, `--accent #4f7a3d`, `--danger #b8402f`, `--text #3A2E27`, `--text-muted #6f6052`.
  - **Dark:** `--bg #1E1A24`, `--surface #2A2433`, `--primary #F0935A`, `--accent #8FBF7A`, `--text #EDE6DE`.
  - These sunny values are chosen to **pass WCAG AA** (the prior build failed AA here — do not regress).
- [ ] `styles/components.scss`: rounded components — `.btn` (+ `--primary/ghost/danger`), `.card`, `.input`, `.select`, `.badge` (HSK pills), `.nav`, `.toggle`, `.grid`, `.flashcard`, **`.speak-btn`** (the 🔊 control, used by F9's partial). Generous radii; `:focus-visible` outlines.
- [ ] `styles/main.scss`: `@use` tokens/themes/components **and the lane stubs** `@use 'lanes/browse'; @use 'lanes/study'; @use 'lanes/admin';`. Base resets.
- [ ] **Create empty lane SCSS stubs** `styles/lanes/_browse.scss`, `_study.scss`, `_admin.scss` (a one-line `// filled by Lane A/B/C` comment each). Lanes fill these; `main.scss` never changes again.
- [ ] `components/theme.ts`: Alpine component — read saved theme from `localStorage`, else `prefers-color-scheme`; set `document.documentElement.dataset.theme`; `toggle()` flips + persists. Apply theme **before paint** via a tiny inline `<head>` script (no FOUC). Register it in `main.ts`.
- [ ] `views/partials/nav.eta` (**pre-stub all links**): brand, theme toggle, and — gated by `currentUser` — **Browse `/characters`**, **Study `/study`**, role-gated **Admin `/admin`**, user name, Logout; Login when logged out. Lanes never touch this file.
- [ ] `views/partials/flash.eta` + `views/partials/empty-state.eta` (friendly, reused by auth/admin/lanes).
- [ ] `base.eta`: add the no-FOUC script, the nav partial, a themed content container, footer.

### Files created

- `styles/{tokens,themes,components,main}.scss`; `styles/lanes/{_browse,_study,_admin}.scss` (stubs)
- `components/theme.ts`
- updated `base.eta`; new `views/partials/{nav,flash,empty-state}.eta`

### Acceptance criteria

- Toggling theme switches Sunny⇄Dark instantly and persists across reloads; no FOUC.
- Buttons/cards/inputs visibly rounded and consistent in both themes.
- Nav already shows Browse/Study/Admin links (Admin only for admins) — lanes just implement the targets.
- `main.scss` compiles with the empty lane stubs present.

### How to verify

```bash
pnpm dev
# Toggle theme, reload — choice sticks. DevTools: <html data-theme> changes. Throttle + hard reload — no FOUC.
```

---

## F7 — Auth + roles + session ◄ AUTH CONTRACT

**Phase:** 0 — Foundation (sequential). **Depends on:** F5 (users table), F6 (layout for login).

**Goal:** Session-based login with two roles, the `requireUser` / `requireAdmin` guards lanes
depend on, login/logout, seeded users, and a **dev fixture** so UI lanes have data immediately.

### Tasks

- [ ] Deps: `@fastify/secure-session`, `@fastify/cookie`.
- [ ] `src/server/lib/password.ts`: `hash(password)` / `verify(password, stored)` using Node `crypto.scrypt` + random salt; stored format `"<saltHex>:<hashHex>"`; constant-time compare (`crypto.timingSafeEqual`).
- [ ] `src/server/plugins/session.ts`: register `@fastify/secure-session` with key from `SESSION_SECRET`; cookie `httpOnly`, `sameSite: 'lax'`, `secure` in prod, sensible `maxAge`.
- [ ] `src/server/plugins/auth.ts`:
  - `preHandler` (app-wide) loads the session user id → fetches user → sets `request.user` (`User | null`); expose `currentUser` to all templates via the render helper.
  - **Decorate the app** with `requireUser` (redirect to `/login` if anonymous) and `requireAdmin` (403 if `role !== 'admin'`). **These decorators are the contract lanes call** inside their route plugins.
- [ ] `src/server/routes/auth.ts` (autoloaded):
  - `GET /login` → login page (Alpine client validation, friendly errors).
  - `POST /login` → Zod-validate, `verify`, set session, redirect `/characters`; on failure re-render generic "invalid email or password".
  - `POST /logout` → clear session, redirect `/`.
- [ ] `views/pages/login.eta`.
- [ ] **Shared seed helper** `scripts/seed-users.ts`: `export async function seedUsers(db)` — upsert admin (`ADMIN_EMAIL/PASSWORD`) + test user (`TEST_USER_EMAIL/PASSWORD`), idempotent, never log passwords. **Imported by both `seed-dev.ts` (below) and Lane D's `seed.ts`.**
- [ ] **Dev fixture** `scripts/seed-dev.ts` + npm `seed:dev`: call `seedUsers(db)`, then upsert ~6 hand-picked characters (with pre-derived zhuyin + `pinyinSearch`) and 2 example sentences. No downloads, no phonetics dependency — this unblocks Lanes A/B/C before Lane D exists.

### Files created

- `src/server/lib/password.ts`, `plugins/{session,auth}.ts`, `routes/auth.ts`, `views/pages/login.eta`
- `scripts/seed-users.ts`, `scripts/seed-dev.ts`

### Acceptance criteria

- Admin + test user log in; bad creds → generic error. Session persists; logout clears it.
- `requireUser` redirects anonymous users to `/login`; `requireAdmin` blocks the test user (403).
- Passwords are scrypt-hashed (never plaintext).
- `pnpm seed:dev` produces a usable DB (2 users + ~6 chars + 2 sentences).

### How to verify

```bash
pnpm db:migrate && pnpm seed:dev && pnpm dev
# Log in as test user → /characters works (data present), /admin → 403. Admin → /admin works. Logout clears session.
sqlite3 data/sweet-potato.db 'select email, role, substr(password_hash,1,12) from users;'
```

---

## F8 — Phonetics library + first tests

**Phase:** 0 — Foundation (sequential; may be built any time after F5). **Depends on:** F2 (Vitest), F5 (none at runtime — pure functions).

**Goal:** Pure, well-tested pinyin/zhuyin helpers consumed by Lane D (seed) and Lane C (admin
"derive zhuyin"), plus the search-normalizer that powers `pinyin_search`.

### Tasks

- [ ] `src/server/lib/pinyin.ts`:
  - `normalize(pinyin)` — numbered tones (`ni3`) → tone-marked (`nǐ`) if the source uses numbers; split syllables.
  - **`stripTones(pinyin): string`** — lowercase, remove tone diacritics, drop spaces/apostrophes → the `pinyin_search` value (e.g. `"Nǐ Hǎo"` → `"nihao"`). Pure, no I/O.
- [ ] `src/server/lib/zhuyin.ts`: **deterministic `pinyinToZhuyin(pinyin): string`** (initials/finals/tone-mark mapping). Pure. Handle neutral tone, `ü`, `er`, whole-syllable forms (zhi/chi/shi/ri/zi/ci/si). Multi-syllable input → space-joined zhuyin.
- [ ] `tests/zhuyin.test.ts` (Vitest) + npm `test:zhuyin` (`vitest run tests/zhuyin.test.ts`):
  - Assert a fixed table: 你→ㄋㄧˇ, 中→ㄓㄨㄥ, 綠→ㄌㄩˋ, 兒→ㄦˊ, plus a few multi-syllable words.
  - Assert `stripTones`: `"nǐ hǎo"`→`"nihao"`, `"lǜ"`→`"lu"` (or chosen `ü` rule — document it), `"Wǒ"`→`"wo"`.
  - Fail loudly on any mismatch.

> This is the project's first real Vitest suite — it proves the harness from F2 works and gives
> the seed + admin lanes a trustworthy converter. Note the known multi-reading (多音字)
> limitation: pick the first reading, same as the seed.

### Files created

- `src/server/lib/pinyin.ts`, `src/server/lib/zhuyin.ts`
- `tests/zhuyin.test.ts`

### Acceptance criteria

- `pnpm test:zhuyin` passes on the fixed table (zhuyin + stripTones cases).
- `pinyinToZhuyin` and `stripTones` are pure (no DB/network) and import cleanly into scripts.

### How to verify

```bash
pnpm test:zhuyin     # green
```

---

## F9 — Shared client primitives (display toggles + audio) ◄ UI CONTRACTS

**Phase:** 0 — Foundation (sequential). **Depends on:** F2 (bundle), F6 (layout, `.speak-btn`).

**Goal:** The two Alpine stores every UI lane consumes — `display` (script/notation toggles) and
`audio` (Web Speech pronunciation) — plus the reusable 🔊 partial, plus the **component stubs**
(`flashcard`, `admin-forms`) wired into `main.ts` so lanes never edit the entrypoint.

### Tasks

#### Display toggle store
- [ ] `components/toggles.ts`: `Alpine.store('display', { script: 'simplified'|'traditional', notation: 'pinyin'|'zhuyin'|'both', ... })`, persisted to `localStorage`, default **traditional + both**. Two toggle controls (placed by lanes in their headers, reading `$store.display`).

#### Audio store (Web Speech API)
- [ ] `components/audio.ts`:
  - `export interface Speaker { available: boolean; speak(text, opts?): void; cancel(): void; }` — the swap seam for a future cloud TTS.
  - `class WebSpeechSpeaker implements Speaker` wrapping `window.speechSynthesis`.
  - **`pickVoice(voices): SpeechSynthesisVoice | null`** — pure, exported for testing. Prefer lang `zh-TW` → `zh-HK` → `zh` → `zh-CN` → `zh-SG`; null if none.
  - Handle Chrome's async voice load: listen for `voiceschanged`, recompute `available` + chosen voice.
  - `Alpine.store('audio', { available, voiceName, autoPlay (persisted), speak(text), cancel(), toggleAutoPlay() })`. `speak()` cancels any in-flight utterance first; sets `lang` from the picked voice.
  - When unsupported / no zh voice → `available = false` (the partial hides/disables the button).
- [ ] `views/partials/speak-button.eta`: a `<button class="speak-btn" ... x-show="$store.audio.available" @click="$store.audio.speak(<%= it.text %>)" :aria-label="...">🔊</button>` taking a `text` local. Lanes include this partial wherever pronunciation is offered.
- [ ] **Voice-picker (settings):** a small control (in nav or a settings popover) listing available `zh*` voices when more than one exists, plus the **auto-play-on-flip** toggle. Persist both.

#### Component stubs + registration
- [ ] Create **stub** `components/flashcard.ts` and `components/admin-forms.ts` — each registers an empty `Alpine.data('flashcard'|'adminForm', () => ({}))`. Lanes B/C fill these.
- [ ] Finalize `main.ts`: import + register `theme`, `toggles`, `audio`, `flashcard`, `admin-forms`. **After this step `main.ts` is frozen.**

#### Tests
- [ ] `tests/audio.test.ts` (Vitest): unit-test `pickVoice()` with a mocked voices array — picks `zh-TW` over `zh-CN`; returns null when no `zh*` voice.

### Files created

- `components/{toggles,audio}.ts`; **stub** `components/{flashcard,admin-forms}.ts`
- `views/partials/speak-button.eta`
- updated `main.ts`; `tests/audio.test.ts`

### Acceptance criteria

- `$store.display` toggles persist across reloads; `$store.audio.speak('你好')` speaks via a zh voice when one exists, and the 🔊 button is hidden when none does.
- Auto-play-on-flip preference persists.
- `main.ts` registers all five components; **lanes need not modify it.**
- `pnpm test` includes `audio.test.ts` green.

### How to verify

```bash
pnpm dev
# In console: Alpine.store('audio').speak('你好嗎')  → hear it (if a zh voice is installed).
# Toggle script/notation persists on reload. pnpm test → audio + zhuyin specs pass.
```

---

# Part 4: Parallel Lanes

---

## A1 — Character browse page

**Phase:** 1 — Lane A (reading). **Depends on:** Foundation (F3 render+autoload, F5 types, F6 UI+nav, F7 `requireUser`, F9 `display`+`audio`). **Then:** A2.

**Goal:** An authenticated `/characters` page listing seeded characters as a rounded card grid,
with search, HSK-level filter, pagination, script⇄notation toggles, and a 🔊 on each card.

### Owns (only these files)

- `src/server/routes/characters.ts`
- `views/pages/characters.eta`, `views/partials/character-card.eta`
- fills `styles/lanes/_browse.scss`
- `tests/characters.test.ts`

### Tasks

- [ ] `routes/characters.ts` (autoloaded; `export default async (app) => {...}`), `GET /characters` guarded by `app.requireUser`:
  - Query params (Zod): `q` (search), `level` (HSK filter), `page` (default 1, size ~48).
  - Drizzle query: match `q` against `simplified` / `traditional` / `pinyin` / **`pinyinSearch`** / `definition`. **SQLite has no `ilike`** — use `like` with `lower(...)` / `COLLATE NOCASE` for the romanized + English columns. Use `stripTones(q)` against `pinyinSearch` so `hao` matches `hǎo`. `where hskLevel = ?` when `level` set; `limit/offset` + a `count()` for pagination.
  - Render `pages/characters.eta` with results, active filters, pagination metadata.
- [ ] `pages/characters.eta`: search box + HSK `<select>` (GET form, no JS needed), responsive `.grid` of `character-card` partials. Two toggle controls bound to `$store.display` (from F9) in the header.
- [ ] `partials/character-card.eta`: links to `/characters/:id`; shows big character, pinyin, zhuyin, short definition, HSK `.badge`, and the `speak-button` partial (`text` = the character per current script). Render **both** scripts and **both** notations in the DOM; `$store.display` shows/hides via `x-show`/classes — instant, no refetch.
- [ ] Empty state → `empty-state` partial. Pagination links preserve `q` + `level`.
- [ ] `_browse.scss`: grid/card spacing tweaks only (base `.card`/`.grid` come from F6).
- [ ] `tests/characters.test.ts`: integration test of the search/filter query builder against an in-memory/temp SQLite seeded with a few rows (search hit, tone-insensitive pinyin hit via `pinyinSearch`, level filter, pagination count).

### Acceptance criteria

- Logged-in users see a paginated grid; anonymous → redirected to `/login`.
- Search (incl. tone-insensitive pinyin) + HSK filter narrow results and survive pagination.
- Script/notation toggles switch instantly and persist; 🔊 speaks the character.

### How to verify

```bash
pnpm seed:dev && pnpm dev    # logged in
# /characters → grid. Search "hao", filter HSK 1, page 2. Toggle script/notation. Click 🔊.
pnpm test characters
```

---

## A2 — Character detail page

**Phase:** 1 — Lane A (reading). **Depends on:** A1 (route module, page conventions), Foundation (F5 sentences type, F9 `audio`).

**Goal:** `/characters/:id` shows the full entry — large character (both scripts), pinyin,
zhuyin, definition, example sentences (feature #8), each with 🔊.

### Owns (only these files)

- updated `src/server/routes/characters.ts` (adds the `:id` route)
- `views/pages/character-detail.eta`, `views/partials/sentence-item.eta`
- (extends `tests/characters.test.ts`)

### Tasks

- [ ] `GET /characters/:id` (`app.requireUser`) in `characters.ts`:
  - Fetch the character; styled **404** if missing. Fetch its `example_sentences` ordered by `sortOrder, id`.
  - Render `pages/character-detail.eta`.
- [ ] `pages/character-detail.eta`:
  - Hero: very large character (`--fs-char`); show both simplified + traditional, labeled; respect `$store.display.script`. A 🔊 (`speak-button`) on the character.
  - Pinyin + zhuyin together, per `$store.display.notation` (from F9).
  - Definition block.
  - **Example sentences** via `sentence-item` partial: traditional/simplified (per toggle), pinyin/zhuyin (per toggle), English translation, and a 🔊 on each sentence. Friendly empty state ("No example sentences yet") when none.
  - Back-to-browse + "Study this set" links; if `currentUser.role === 'admin'`, an **Edit** link to `/admin/characters/:id/edit` (Lane C builds the target).
- [ ] `partials/sentence-item.eta`: one sentence row + its `speak-button`.
- [ ] Reuse `$store.display` so prefs match the browse page. Prev/next within the HSK level is a nice-to-have (note only).
- [ ] Extend `tests/characters.test.ts`: `:id` returns the character + ordered sentences; missing id → 404.

### Acceptance criteria

- Detail page shows character, pinyin, zhuyin, definition, and any sentences; toggles behave exactly like browse.
- 🔊 pronounces the character and each sentence (when a zh voice exists).
- Admins see Edit; regular users do not. Missing id → styled 404.

### How to verify

```bash
pnpm dev
# Open a card → detail. Toggle script/notation. Click 🔊 on the character and a sentence.
# (After Lane C + G2) add a sentence as admin → appears here.
pnpm test characters
```

---

## B1 — Study route + deck

**Phase:** 1 — Lane B (study). **Depends on:** Foundation (F3, F5, F6, F7 `requireUser`, F9 `display`+`audio`). **Then:** B2, B3.

**Goal:** `GET /study` — a deck picker and a shuffled deck of characters serialized for the
flashcard component.

### Owns (only these files)

- `src/server/routes/study.ts`
- `views/pages/study.eta`
- fills `styles/lanes/_study.scss`
- `tests/study.test.ts`

### Tasks

- [ ] `routes/study.ts` (autoloaded), `GET /study` guarded by `app.requireUser`:
  - Query (Zod): `level` (optional HSK) + `limit` (default ~30).
  - Fetch a shuffled deck: Drizzle `.orderBy(sql\`RANDOM()\`).limit(n)` (SQLite `RANDOM()`), filtered by `hskLevel` when `level` set.
  - Render `pages/study.eta` with the deck serialized into a `<script type="application/json">` for the Alpine component (B2). Include both scripts + both notations per card so toggles work offline.
- [ ] `pages/study.eta`: deck-picker UI (level `<select>` + limit + Start), the flashcard mount (`x-data="flashcard"`), the auto-play-on-flip toggle bound to `$store.audio` (F9), and toggle controls bound to `$store.display`.
- [ ] `_study.scss`: flashcard layout/animation tweaks (base `.flashcard` from F6).
- [ ] `tests/study.test.ts`: deck query returns ≤ limit rows; `level` filter applies; deck JSON shape matches what B2 expects.

### Acceptance criteria

- `/study` (logged in) renders a deck picker and serializes a shuffled deck; anonymous → `/login`.
- `level` + `limit` shape the deck.

### How to verify

```bash
pnpm seed:dev && pnpm dev   # logged in
# /study → pick HSK 1, limit 20 → deck JSON present in page source.
pnpm test study
```

---

## B2 — Flashcard component (+ audio)

**Phase:** 1 — Lane B (study). **Depends on:** B1 (page + deck JSON), Foundation (F9 `flashcard` **stub**, `display`, `audio`).

**Goal:** Fill the `flashcard` Alpine stub: flip, shuffle, mark known/again, keyboard, audio,
end-of-deck summary.

### Owns (only these files)

- **fills** `src/client/components/flashcard.ts` (the F9 stub — do not change its registration in `main.ts`)
- (extends `tests/study.test.ts` or adds `tests/flashcard.test.ts`)

### Tasks

- [ ] `components/flashcard.ts`: read the deck JSON; hold `deck`, `index`, `flipped`, tallies.
  - **Front:** the character (script per `$store.display`). Click/tap or **Space** → flip.
  - **Back:** pinyin, zhuyin, definition (notation per `$store.display`).
  - **Buttons:** Known / Again → advance + `POST /api/reviews` (B3); do **not** block the UI on the response (fire-and-forget, tolerate failure).
  - **Audio:** a 🔊 to speak the current character; if `$store.audio.autoPlay`, speak on flip. Use `$store.audio.speak(...)`. (iOS: speaking on the flip click is a valid user gesture.)
  - Shuffle button; progress `7 / 30`; end-of-deck summary (known vs again) with Restart / New deck.
  - Keyboard: Space flip, `1` = again, `2` = known, ← / → prev/next.
- [ ] Reuse `$store.display` + `$store.audio` (no private copies).
- [ ] Tests: pure deck logic (advance, shuffle determinism with seeded RNG if used, tally counts, end-of-deck detection).

### Acceptance criteria

- Deck loads; cards flip; Known/Again advance and reach an end-of-deck summary.
- Each Known/Again triggers a `POST /api/reviews` (B3).
- Shuffle reorders; keyboard shortcuts work; toggles affect front/back; 🔊 / auto-play speak the character.

### How to verify

```bash
pnpm dev   # logged in
# /study → flip, mark Known/Again to the end. Toggle auto-play → hear each card on flip. Keyboard 1/2/Space/arrows.
pnpm test
```

---

## B3 — Reviews API

**Phase:** 1 — Lane B (study). **Depends on:** Foundation (F5 `reviews` type, F7 `requireUser`), B2 (caller).

**Goal:** `POST /api/reviews` — log a flashcard review for the current user.

### Owns (only these files)

- `src/server/routes/api.ts`
- (extends `tests/study.test.ts`)

### Tasks

- [ ] `routes/api.ts` (autoloaded), `POST /api/reviews` guarded by `app.requireUser`:
  - Zod body `{ characterId: number, rating: 'known' | 'again' }`.
  - Insert a `reviews` row for `request.user.id`; return `{ ok: true }`.
  - Validate the character exists (or rely on the FK — return 400 on FK failure rather than 500).
- [ ] Test: a valid POST inserts a row attributed to the user; bad body → 400; anonymous → redirect/401.

### Acceptance criteria

- Known/Again from B2 writes a `reviews` row attributed to the current user.
- Invalid payloads return 400, not 500.

### How to verify

```bash
pnpm dev   # logged in, run a deck in /study
sqlite3 data/sweet-potato.db 'select rating, count(*) from reviews group by 1;'
pnpm test study
```

---

## C1 — Admin dashboard + character list

**Phase:** 1 — Lane C (admin). **Depends on:** Foundation (F3, F5, F6, F7 `requireAdmin`). **Then:** C2, C3.

**Goal:** Admin-only `/admin` dashboard with counts, and `/admin/characters` listing all
characters with search + edit/delete.

### Owns (only these files — shared across C1–C3)

- `src/server/routes/admin.ts`
- `views/pages/admin/{dashboard,characters-list}.eta`, `views/partials/admin-bar.eta`
- fills `styles/lanes/_admin.scss`
- `tests/admin.test.ts`

### Tasks

- [ ] `routes/admin.ts` (autoloaded): register everything under the `/admin` prefix in one
  plugin scope with `app.requireAdmin` as a scope-wide `preHandler` (every admin route guarded).
- [ ] `GET /admin` → `pages/admin/dashboard.eta`: counts (characters total + per HSK level, sentences, users, reviews) + quick links.
- [ ] `GET /admin/characters` → `pages/admin/characters-list.eta`: searchable, paginated **table** (compact, not cards): traditional, simplified, pinyin, zhuyin, HSK, #sentences, Edit / Delete. "New character" button → `/admin/characters/new` (form in C2).
- [ ] Delete = per-row POST → `POST /admin/characters/:id/delete` (cascades sentences via FK); Alpine `confirm` before submit; flash on success.
- [ ] `partials/admin-bar.eta`: a distinct admin sub-header (still themed) so the admin area is obvious. `_admin.scss`: table styling.
- [ ] `tests/admin.test.ts`: `requireAdmin` blocks `user`/anonymous (403/redirect); dashboard counts match seeded rows; delete removes character + cascades sentences.

### Acceptance criteria

- Only `admin` reaches `/admin*`; test user → 403.
- Dashboard counts are accurate; list is searchable + paginated.
- Delete removes the character and its sentences, with confirm + flash.

### How to verify

```bash
pnpm seed:dev && pnpm dev   # as admin
# /admin → counts. /admin/characters → search, paginate, delete a throwaway row (sentences cascade).
pnpm test admin
```

---

## C2 — Admin character editor (create / edit / delete)

**Phase:** 1 — Lane C (admin). **Depends on:** C1 (admin scope + list), Foundation (F8 `pinyinToZhuyin`+`stripTones`, F9 `admin-forms` **stub**).

**Goal:** Admin forms to create and edit a character (feature #7), with validation, a
zhuyin-derive helper, and correct `pinyinSearch` maintenance.

### Owns (only these files)

- updated `src/server/routes/admin.ts`
- `views/pages/admin/character-form.eta`
- **fills** `src/client/components/admin-forms.ts` (the F9 stub)
- (extends `tests/admin.test.ts`)

### Tasks

- [ ] Routes in `admin.ts` (all under `requireAdmin`):
  - `GET /admin/characters/new` → empty editor.
  - `POST /admin/characters` → Zod-validate, insert, **compute `pinyinSearch = stripTones(pinyin)`** (F8), redirect to the edit page with a success flash.
  - `GET /admin/characters/:id/edit` → editor populated (+ the sentences section from C3).
  - `POST /admin/characters/:id` → validate, update, **recompute `pinyinSearch`**, set `updatedAt = new Date()` (no DB auto-update in SQLite), flash.
  - `POST /admin/derive-zhuyin` → body `{ pinyin }` → `{ zhuyin: pinyinToZhuyin(pinyin) }` (used by the form button).
- [ ] Zod: `traditional`, `simplified`, `pinyin`, `zhuyin`, `definition` required; `hskLevel`, `frequencyRank` optional int. **Unique-violation on `traditional`** → friendly field error, not a 500 (in `better-sqlite3` the error is `SQLITE_CONSTRAINT_UNIQUE` — detect on `err.code`).
- [ ] `pages/admin/character-form.eta` + fill `components/admin-forms.ts`:
  - Inline validation + dirty-state warn on navigate-away.
  - **"Derive zhuyin from pinyin"** button → `POST /admin/derive-zhuyin` → fills the zhuyin field.
  - Standard POST submit (progressive enhancement: works without JS).
  - Reuse the template for create + edit (mode flag).
- [ ] Tests: create persists with correct `pinyinSearch`; duplicate `traditional` → friendly error not 500; derive-zhuyin returns expected mapping.

### Acceptance criteria

- Admin can create + edit characters; changes persist and show on `/characters` + detail.
- Duplicate `traditional` → friendly validation error (no crash).
- Derive-zhuyin button fills the field; `pinyinSearch` is kept in sync so search works.

### How to verify

```bash
pnpm dev   # as admin
# New character → fill, derive zhuyin, save → shows in /characters (search by toneless pinyin works).
# Edit definition → save → reflected on /characters/:id. Duplicate traditional → inline error.
pnpm test admin
```

---

## C3 — Admin example-sentence management

**Phase:** 1 — Lane C (admin). **Depends on:** C2 (character edit page + `admin-forms.ts`), Foundation (F5 `example_sentences`).

**Goal:** Add/edit/delete example sentences for a character from its edit page (feature #8 —
sentences are admin-entered).

### Owns (only these files)

- updated `src/server/routes/admin.ts`
- updated `views/pages/admin/character-form.eta`; new `views/partials/sentence-fields.eta`
- updated `src/client/components/admin-forms.ts`
- (extends `tests/admin.test.ts`)

### Tasks

- [ ] Routes in `admin.ts` (under `requireAdmin`), each redirecting back to the character edit page with a flash:
  - `POST /admin/characters/:id/sentences` → add a sentence to that character.
  - `POST /admin/sentences/:id` → update (set `updatedAt`).
  - `POST /admin/sentences/:id/delete` → delete.
  - Scope every sentence op to its parent character (no cross-character edits).
- [ ] Zod: `traditional`, `simplified`, `translation` required; `pinyin`, `zhuyin`, `notes` optional; `sortOrder` optional int.
- [ ] Sentences section on `character-form.eta` (**edit mode only**) + `partials/sentence-fields.eta`:
  - List existing sentences with inline edit + delete (Alpine: expand a row into editable fields).
  - "Add sentence" form (extend `admin-forms.ts`).
  - Optional per-sentence "derive zhuyin from pinyin" (reuse the C2 `/admin/derive-zhuyin` endpoint).
  - Reorder via `sortOrder` number input (drag-reorder is a nice-to-have, note only).
- [ ] Tests: add/update/delete a sentence; deleting the character cascades its sentences (FK from F5); cross-character edit is rejected.

### Acceptance criteria

- Admin can add/edit/delete sentences on a character's edit page.
- Saved sentences appear (ordered by `sortOrder`) on public `/characters/:id` (Lane A).
- Deleting a character cascades its sentences.

### How to verify

```bash
pnpm dev   # as admin
# Edit a character → add 2 sentences w/ translations → save. Open /characters/:id → both render in order.
# Edit one, delete the other → detail reflects changes.
pnpm test admin
```

---

## D1 — Data download

**Phase:** 1 — Lane D (data). **Depends on:** Foundation only (F1 scripts dir). Runs fully in parallel — touches no `src/` files. **Then:** D2.

**Goal:** A repeatable downloader that fetches the HSK word list + CC-CEDICT into
`scripts/data/` (gitignored), cached, with provenance recorded.

### Owns (only these files — shared with D2)

- `scripts/download-data.ts`, `scripts/sources.ts`
- `scripts/data/README.md`
- (`scripts/seed.ts` and `tests/seed.test.ts` are added in D2)

### Tasks

- [ ] `scripts/sources.ts`: source URLs as constants + short provenance notes. Primary HSK
  source: a maintained HSK 3.0 dataset that already bundles simplified/traditional/pinyin/
  meanings/levels (e.g. `drkameleon/complete-hsk-vocabulary` `complete.min.json`, levels
  `n1`–`n7`). Secondary: **CC-CEDICT** (`cedict_ts.u8`) as a definition/traditional fallback.
- [ ] `scripts/download-data.ts`: fetch each source into `scripts/data/` (gitignored). Cache;
  skip re-download if present; `--force` to refresh. npm `data:download`.
- [ ] `scripts/data/README.md`: record source URLs, licenses, and retrieval date.

### Acceptance criteria

- `pnpm data:download` populates `scripts/data/` and is idempotent (re-run skips unless `--force`).
- Provenance + licenses recorded.

### How to verify

```bash
pnpm data:download && ls -la scripts/data
```

---

## D2 — Seed HSK characters

**Phase:** 1 — Lane D (data). **Depends on:** D1 (data files), Foundation (F5 schema, F8 `pinyinToZhuyin`+`stripTones`, F7 `seedUsers`).

**Goal:** Parse the HSK list, load HSK 1–3 **single characters** (simplified/traditional/
pinyin/definition), derive zhuyin + `pinyinSearch`, and upsert into `characters` — plus seed
users via the shared helper.

### Owns (only these files)

- `scripts/seed.ts`
- `tests/seed.test.ts`

### Tasks

- [ ] `scripts/seed.ts` (npm `seed`):
  1. Parse the HSK list → filter to `HSK_LEVELS` (default 1–3) and **single characters only**.
  2. Build a CC-CEDICT map (key by simplified) → look up traditional + definition; dedupe keeping the first reading (note the 多音字 multi-reading limitation).
  3. `zhuyin = pinyinToZhuyin(pinyin)` and `pinyinSearch = stripTones(pinyin)` (F8).
  4. Upsert into `characters` — `onConflictDoUpdate` on `traditional`; set `hskLevel`.
  5. `await seedUsers(db)` (the shared F7 helper — **do not** duplicate user-seeding logic).
  6. Print a summary (counts per level, skipped rows).
- [ ] `tests/seed.test.ts`: parser maps a sample HSK row → a `NewCharacter` with non-empty
  simplified/traditional/pinyin/zhuyin/`pinyinSearch`/definition/`hskLevel`; single-character
  filter drops multi-char words; upsert is idempotent (re-seed = no duplicate `traditional`).

> Mirrors the prior build, which loaded **542** single chars (HSK1 212 / HSK2 176 / HSK3 154).
> `seed` supersedes the `seed:dev` fixture once real data is wanted (G2).

### Acceptance criteria

- `pnpm seed` loads several hundred HSK 1–3 characters, each with non-empty simplified,
  traditional, pinyin, **zhuyin**, **`pinyinSearch`**, definition, `hskLevel`.
- Re-running `pnpm seed` updates in place (no duplicates).
- `tests/seed.test.ts` passes.

### How to verify

```bash
pnpm data:download && pnpm seed
sqlite3 data/sweet-potato.db 'select hsk_level, count(*) from characters group by 1 order by 1;'
sqlite3 data/sweet-potato.db "select traditional, simplified, pinyin, zhuyin, pinyin_search from characters where simplified='你';"
pnpm test seed
```

---

# Part 5: Integration Steps (G1–G4)

---

## G1 — Integration & merge

**Phase:** 2 — Integration (sequential, orchestrator). **Depends on:** Lanes A, B, C, D complete.

**Goal:** Bring the four lanes together on `main` and prove the whole app builds, type-checks,
lints, tests, and runs as one process.

### Tasks

- [ ] **Merge** each lane's worktree/branch into `main`. By the ownership matrix the lanes touch
  disjoint files, so merges should be conflict-free. If a conflict appears, it means two lanes
  edited a shared file — fix the boundary, don't paper over it.
- [ ] Confirm the **stub-and-fill** files were filled, not duplicated: `flashcard.ts`,
  `admin-forms.ts`, `lanes/_browse.scss`, `_study.scss`, `_admin.scss`. `main.ts` and
  `main.scss` should be unchanged since F9/F6.
- [ ] Confirm every lane route auto-loaded (no manual `index.ts` edits): `/characters`,
  `/characters/:id`, `/study`, `/api/reviews`, `/admin*`.
- [ ] Run the full gate: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- [ ] Smoke test on the **dev fixture** (`pnpm seed:dev`): nav links resolve; auth gating holds;
  toggles + audio shared stores behave the same on every page (one `$store.display`, one
  `$store.audio`).

### Acceptance criteria

- Clean merge; all gates green; every route present and guarded.
- Shared stores are singletons (no lane shipped a private copy of toggles/audio).

### How to verify

```bash
pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm db:migrate && pnpm seed:dev && pnpm dev   # click through every nav link as admin + as test user
```

---

## G2 — Seed real data + content pass

**Phase:** 2 — Integration (sequential). **Depends on:** G1, Lane D.

**Goal:** Replace the dev fixture with the real HSK 1–3 seed and verify every page against real
data + audio.

### Tasks

- [ ] `pnpm data:download && pnpm seed` against a fresh `data/sweet-potato.db` (delete the
  fixture db first, or run seed which upserts over it).
- [ ] Verify counts per HSK level look right (~500–900 chars).
- [ ] Spot-check browse/detail/study with real characters: zhuyin correct, `pinyinSearch`
  makes toneless pinyin search work, 🔊 pronounces real characters + sentences.
- [ ] Add a couple of admin example sentences (via Lane C) to a few high-frequency characters so
  the detail page's sentence feature is demonstrable.

### Acceptance criteria

- Real HSK data loads; pages render correctly; search (incl. toneless pinyin) works; audio works.
- At least a few characters have example sentences for demo.

### How to verify

```bash
rm -f data/sweet-potato.db* && pnpm db:migrate && pnpm data:download && pnpm seed && pnpm dev
sqlite3 data/sweet-potato.db 'select hsk_level, count(*) from characters group by 1 order by 1;'
```

---

## G3 — Deploy (portable Docker + persistent volume)

**Phase:** 2 — Integration (sequential). **Depends on:** a working app (G1–G2).

**Goal:** A portable container that runs migrations on start and keeps the SQLite file on a
**persistent volume**, so data survives redeploys. Host-agnostic (Fly / Render / Railway later).

> The one real cost of SQLite: the `.db` file must live on durable storage. On an ephemeral
> container filesystem it is wiped on redeploy. The volume below is what makes it safe.

### Tasks

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

### Files created

- `Dockerfile`, `.dockerignore`, `README.md` (`src/server/db/migrate.ts` already exists from F4)

### Acceptance criteria

- `docker build .` succeeds; container boots, runs migrations, serves `/healthz`.
- The SQLite file is created on the mounted volume and **survives a container restart**.
- README takes a fresh clone to a running local app and a live deploy.

### How to verify

```bash
docker build -t sweet-potato .
docker run --rm -v sp_data:/data -e SESSION_SECRET=$(openssl rand -hex 32) -p 3000:3000 sweet-potato
curl -s localhost:3000/healthz                 # {"ok":true} after migrations
# Restart the container with the same -v sp_data:/data → data is still there.
```

---

## G4 — QA checklist + audio & accessibility pass

**Phase:** 2 — Integration (sequential). **Depends on:** G1–G3.

**Goal:** End-to-end verification, code-quality gates, an **audio cross-browser/voice pass**, and
accessibility before calling the first build done.

### Automated gates

- [ ] `pnpm typecheck` · `pnpm lint` · `pnpm test` (all lane specs + zhuyin + audio) · `pnpm build` — all clean.

### End-to-end manual script

Fresh DB: `rm -f data/*.db* && pnpm db:migrate && pnpm seed && pnpm dev`.

- [ ] **Home/theme:** `/` renders; theme toggle persists; no FOUC.
- [ ] **Auth:** log in as admin and (separately) test user; bad password → generic error; logout clears session.
- [ ] **Authz:** test user → `/admin` = 403; anonymous → `/characters`, `/study`, `/admin` redirect to `/login`.
- [ ] **Browse:** grid; search (incl. **toneless pinyin** via `pinyin_search`); HSK filter; pagination preserves filters; script + notation toggles instant + persistent.
- [ ] **Detail:** character, pinyin, zhuyin, definition, sentences; toggles consistent; bad id → 404.
- [ ] **Study:** deck loads; flip; Known/Again advance; end summary; keyboard; each rating writes a `reviews` row.
- [ ] **Admin CRUD:** create (derive zhuyin) → appears in browse + searchable by toneless pinyin; edit → reflected on detail; duplicate `traditional` → friendly error; add/edit/delete sentences → reflected on public detail; delete character → cascades sentences.

### Audio pass

- [ ] 🔊 on browse cards, character detail (character + each sentence), and flashcards all speak via a Chinese voice.
- [ ] Auto-play-on-flip works in study and persists.
- [ ] **No-voice fallback:** with Chinese voices disabled/absent, the 🔊 button is hidden/disabled with a tooltip — no errors, app still usable.
- [ ] **Cross-browser:** verify Chrome (async `voiceschanged`), Safari/macOS (good zh-TW voice), and note iOS Safari's user-gesture requirement. Document which voices were available where.
- [ ] Voice-picker (when >1 zh voice) selects the speaking voice; preference persists.

### Accessibility & polish

- [ ] **Color contrast AA in both themes** (verify the sunny tokens from F6 actually pass — the prior build regressed here).
- [ ] Keyboard: all interactive elements focusable; visible focus ring; flashcard fully keyboard-usable; 🔊 reachable + labeled.
- [ ] Forms have labels; errors associated; buttons have accessible names.
- [ ] CJK font crisp at `--fs-char`; comfortable line-height. Responsive: grid + flashcard usable on mobile.
- [ ] Friendly empty states everywhere (no results, no sentences, empty deck, no audio voice).

### Sign-off

- [ ] All 8 requested features work, plus flashcards **and audio**.
- [ ] Deploy dry-run (G3) succeeds incl. volume persistence.
- [ ] Commit + push; offer to push unpushed commits (per global prefs).

### How to verify

Work top-to-bottom on a fresh database across at least two browsers; everything checked = first build complete.
