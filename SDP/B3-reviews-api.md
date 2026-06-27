# B3 — Reviews API

**Phase:** 1 — Lane B (study). **Depends on:** Foundation (F5 `reviews` type, F7 `requireUser`), B2 (caller).

**Goal:** `POST /api/reviews` — log a flashcard review for the current user.

## Owns (only these files)

- `src/server/routes/api.ts`
- (extends `tests/study.test.ts`)

## Tasks

- [ ] `routes/api.ts` (autoloaded), `POST /api/reviews` guarded by `app.requireUser`:
  - Zod body `{ characterId: number, rating: 'known' | 'again' }`.
  - Insert a `reviews` row for `request.user.id`; return `{ ok: true }`.
  - Validate the character exists (or rely on the FK — return 400 on FK failure rather than 500).
- [ ] Test: a valid POST inserts a row attributed to the user; bad body → 400; anonymous → redirect/401.

## Acceptance criteria

- Known/Again from B2 writes a `reviews` row attributed to the current user.
- Invalid payloads return 400, not 500.

## How to verify

```bash
pnpm dev   # logged in, run a deck in /study
sqlite3 data/sweet-potato.db 'select rating, count(*) from reviews group by 1;'
pnpm test study
```
