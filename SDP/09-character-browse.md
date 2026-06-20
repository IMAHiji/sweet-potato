# Step 09 — Character browse page

**Goal:** An authenticated `/characters` page listing the seeded characters as a
rounded card grid, with search, HSK-level filter, pagination, and client toggles for
simplified⇄traditional and pinyin⇄zhuyin.

**Depends on:** 06 (UI), 07 (auth guard), 08 (data).

## Tasks

- [ ] `src/server/routes/characters.ts`, `GET /characters` (guard: `requireUser`):
  - Query params (Zod): `q` (search simplified/traditional/pinyin/definition), `level` (HSK filter), `page` (default 1, page size ~48).
  - Drizzle query with `ilike`/`or` filters, `where hsk_level`, `limit/offset`, plus a count for pagination.
  - Render `pages/characters.eta` with results, active filters, and pagination metadata.
- [ ] `pages/characters.eta`: search box + HSK level `<select>` (GET form, no JS needed), responsive `.grid` of character cards. Each card links to `/characters/:id` and shows: big character, pinyin, zhuyin, short definition, HSK badge.
- [ ] `src/client/components/toggles.ts`: Alpine store `display` with `script: 'simplified'|'traditional'` and `notation: 'pinyin'|'zhuyin'|'both'`, persisted to `localStorage`. Two toggle controls in the page header.
- [ ] Cards render **both** scripts and **both** notations in the DOM; the toggle store shows/hides via `x-show`/classes — instant, no refetch. Default: traditional + both notations (matches app concept).
- [ ] Empty state (no results) uses the friendly `empty-state` partial.
- [ ] Pagination preserves `q` and `level` in links.

## Files created

- `src/server/routes/characters.ts`
- `views/pages/characters.eta`, `views/partials/character-card.eta`
- `src/client/components/toggles.ts`

## Acceptance criteria

- Logged-in users see a paginated grid; anonymous users are redirected to `/login`.
- Search and HSK filter narrow results and survive pagination.
- Script and notation toggles switch instantly and persist across pages/reloads.

## How to verify

```bash
pnpm dev   # logged in
# /characters → grid renders. Search "water", filter HSK 1, page 2.
# Toggle traditional⇄simplified and pinyin⇄zhuyin — instant, persists on reload.
```
