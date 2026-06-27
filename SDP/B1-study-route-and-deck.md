# B1 — Study route + deck

**Phase:** 1 — Lane B (study). **Depends on:** Foundation (F3, F5, F6, F7 `requireUser`, F9 `display`+`audio`). **Then:** B2, B3.

**Goal:** `GET /study` — a deck picker and a shuffled deck of characters serialized for the
flashcard component.

## Owns (only these files)

- `src/server/routes/study.ts`
- `views/pages/study.eta`
- fills `styles/lanes/_study.scss`
- `tests/study.test.ts`

## Tasks

- [ ] `routes/study.ts` (autoloaded), `GET /study` guarded by `app.requireUser`:
  - Query (Zod): `level` (optional HSK) + `limit` (default ~30).
  - Fetch a shuffled deck: Drizzle `.orderBy(sql\`RANDOM()\`).limit(n)` (SQLite `RANDOM()`), filtered by `hskLevel` when `level` set.
  - Render `pages/study.eta` with the deck serialized into a `<script type="application/json">` for the Alpine component (B2). Include both scripts + both notations per card so toggles work offline.
- [ ] `pages/study.eta`: deck-picker UI (level `<select>` + limit + Start), the flashcard mount (`x-data="flashcard"`), the auto-play-on-flip toggle bound to `$store.audio` (F9), and toggle controls bound to `$store.display`.
- [ ] `_study.scss`: flashcard layout/animation tweaks (base `.flashcard` from F6).
- [ ] `tests/study.test.ts`: deck query returns ≤ limit rows; `level` filter applies; deck JSON shape matches what B2 expects.

## Acceptance criteria

- `/study` (logged in) renders a deck picker and serializes a shuffled deck; anonymous → `/login`.
- `level` + `limit` shape the deck.

## How to verify

```bash
pnpm seed:dev && pnpm dev   # logged in
# /study → pick HSK 1, limit 20 → deck JSON present in page source.
pnpm test study
```
