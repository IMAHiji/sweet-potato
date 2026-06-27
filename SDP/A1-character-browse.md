# A1 — Character browse page

**Phase:** 1 — Lane A (reading). **Depends on:** Foundation (F3 render+autoload, F5 types, F6 UI+nav, F7 `requireUser`, F9 `display`+`audio`). **Then:** A2.

**Goal:** An authenticated `/characters` page listing seeded characters as a rounded card grid,
with search, HSK-level filter, pagination, script⇄notation toggles, and a 🔊 on each card.

## Owns (only these files)

- `src/server/routes/characters.ts`
- `views/pages/characters.eta`, `views/partials/character-card.eta`
- fills `styles/lanes/_browse.scss`
- `tests/characters.test.ts`

## Tasks

- [ ] `routes/characters.ts` (autoloaded; `export default async (app) => {...}`), `GET /characters` guarded by `app.requireUser`:
  - Query params (Zod): `q` (search), `level` (HSK filter), `page` (default 1, size ~48).
  - Drizzle query: match `q` against `simplified` / `traditional` / `pinyin` / **`pinyinSearch`** / `definition`. **SQLite has no `ilike`** — use `like` with `lower(...)` / `COLLATE NOCASE` for the romanized + English columns. Use `stripTones(q)` against `pinyinSearch` so `hao` matches `hǎo`. `where hskLevel = ?` when `level` set; `limit/offset` + a `count()` for pagination.
  - Render `pages/characters.eta` with results, active filters, pagination metadata.
- [ ] `pages/characters.eta`: search box + HSK `<select>` (GET form, no JS needed), responsive `.grid` of `character-card` partials. Two toggle controls bound to `$store.display` (from F9) in the header.
- [ ] `partials/character-card.eta`: links to `/characters/:id`; shows big character, pinyin, zhuyin, short definition, HSK `.badge`, and the `speak-button` partial (`text` = the character per current script). Render **both** scripts and **both** notations in the DOM; `$store.display` shows/hides via `x-show`/classes — instant, no refetch.
- [ ] Empty state → `empty-state` partial. Pagination links preserve `q` + `level`.
- [ ] `_browse.scss`: grid/card spacing tweaks only (base `.card`/`.grid` come from F6).
- [ ] `tests/characters.test.ts`: integration test of the search/filter query builder against an in-memory/temp SQLite seeded with a few rows (search hit, tone-insensitive pinyin hit via `pinyinSearch`, level filter, pagination count).

## Acceptance criteria

- Logged-in users see a paginated grid; anonymous → redirected to `/login`.
- Search (incl. tone-insensitive pinyin) + HSK filter narrow results and survive pagination.
- Script/notation toggles switch instantly and persist; 🔊 speaks the character.

## How to verify

```bash
pnpm seed:dev && pnpm dev    # logged in
# /characters → grid. Search "hao", filter HSK 1, page 2. Toggle script/notation. Click 🔊.
pnpm test characters
```
