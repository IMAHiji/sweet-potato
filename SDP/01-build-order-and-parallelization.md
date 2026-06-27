# Build order & parallelization

This is the **orchestration map**. Read it before building. It defines what must be built
sequentially, what can be built in parallel, who owns which files (so parallel agents never
collide), and how to actually run the parallel build.

---

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
foundation gate passes** (see below). Every lane depends *only* on the foundation — never on
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

---

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

To avoid every lane editing shared entrypoints, Foundation creates these as **working stubs**
and wires them once; the owning lane fills in the body:

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

---

## How to run the build

### Mode 1 — Parallel agents (fastest; the intended path)

1. **Foundation (you, on `main`):** build F1→F9 in order. Run the **foundation gate**. Commit.
2. **Launch lanes:** spawn four agents, each in its **own git worktree** (`isolation: worktree`).
   Give each agent: its lane's step files, this ownership matrix, and the instruction
   *"only create/modify the files your lane owns; consume foundation interfaces as documented;
   write `tests/<lane>.test.ts`; run `pnpm typecheck && pnpm lint && pnpm test` before reporting
   done."*
   - Agent A → `A1-character-browse.md`, `A2-character-detail.md`
   - Agent B → `B1-study-route-and-deck.md`, `B2-flashcard-component.md`, `B3-reviews-api.md`
   - Agent C → `C1-admin-dashboard-and-list.md`, `C2-admin-character-editor.md`, `C3-admin-example-sentences.md`
   - Agent D → `D1-data-download.md`, `D2-seed.md`
3. **Merge (you):** because the lanes touch **disjoint files**, merges are conflict-free by
   construction. Merge A, B, C, D back to `main`.
4. **Integration:** run G1→G4.

### Mode 2 — Sequential (solo fallback)

Build the foundation, then do the lanes one at a time in any order (A, B, C, D), then G1→G4.
Same files, same contracts — you just don't parallelize. Use this if not running worktree agents.

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
