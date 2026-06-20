# Step 05 — Database schema + first migration

**Goal:** Define all tables in Drizzle, generate and apply the first migration.

**Depends on:** 04.

## Tasks

- [ ] `src/server/db/schema.ts` — define tables exactly as in `00-overview.md`:
  - `users` (email unique; `role` text with a check or app-level enum `'admin'|'user'`).
  - `characters` (`traditional` unique; nullable `hsk_level`, `frequency_rank`; `created_at`/`updated_at`).
  - `example_sentences` (FK `character_id` → `characters.id` `onDelete: 'cascade'`; `sort_order` default 0; timestamps).
  - `reviews` (FKs `user_id`, `character_id` both cascade; `rating` text `'known'|'again'`; `reviewed_at` default now).
- [ ] Export inferred types: `User`, `NewUser`, `Character`, `NewCharacter`, `ExampleSentence`, `NewExampleSentence`, `Review` via `$inferSelect` / `$inferInsert`.
- [ ] Add indexes: `characters(hsk_level)`, `characters(simplified)`, `example_sentences(character_id)`, `reviews(user_id, character_id)`.
- [ ] Define `role` and `rating` as TS union types + a Drizzle `text(...).$type<...>()` for type safety.
- [ ] `pnpm db:generate` → review the generated SQL migration; `pnpm db:migrate` → apply.

## Files created

- `src/server/db/schema.ts`
- `src/server/db/migrations/0000_*.sql` (generated)

## Acceptance criteria

- Migration applies cleanly to the local DB; all four tables + indexes + FKs exist.
- Re-running `db:migrate` is a no-op (idempotent).
- TS types import and compile (`pnpm typecheck`).

## How to verify

```bash
pnpm db:generate && pnpm db:migrate
psql $DATABASE_URL -c '\dt'                 # users, characters, example_sentences, reviews
psql $DATABASE_URL -c '\d characters'       # columns, unique(traditional), indexes
pnpm typecheck
```
