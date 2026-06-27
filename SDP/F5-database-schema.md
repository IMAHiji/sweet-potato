# F5 — Database schema + first migration  ◄ TYPE CONTRACT

**Phase:** 0 — Foundation (sequential). **Depends on:** F4.

**Goal:** Define all tables in Drizzle (SQLite), export inferred types, generate and apply the
first migration. **This is the type contract every lane imports — freeze it after the gate.**

## Tasks

- [ ] `src/server/db/schema.ts` using `drizzle-orm/sqlite-core` — tables exactly as in `00-overview.md`:
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

## Files created

- `src/server/db/schema.ts`
- `src/server/db/migrations/0000_*.sql` (generated)

## Acceptance criteria

- Migration applies cleanly to a fresh `data/` db; all four tables + indexes + FKs exist.
- Re-running `db:migrate` is a no-op (idempotent).
- Types import and compile (`pnpm typecheck`).

## How to verify

```bash
pnpm db:generate && pnpm db:migrate
sqlite3 data/sweet-potato.db '.tables'                 # users characters example_sentences reviews
sqlite3 data/sweet-potato.db '.schema characters'      # columns incl. pinyin_search, unique(traditional), indexes
pnpm typecheck
```
