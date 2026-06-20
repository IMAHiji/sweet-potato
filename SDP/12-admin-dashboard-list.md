# Step 12 — Admin dashboard + character list

**Goal:** Admin-only `/admin` dashboard with quick counts, and `/admin/characters`
listing all characters with edit/delete actions and search.

**Depends on:** 07 (`requireAdmin`), 08 (data).

## Tasks

- [ ] `src/server/routes/admin.ts` with a shared `requireAdmin` preHandler on the whole `/admin` prefix (register as a Fastify plugin/scope so every admin route is guarded).
- [ ] `GET /admin` → `pages/admin/dashboard.eta`: counts (characters total + per HSK level, example sentences, users, reviews) and quick links.
- [ ] `GET /admin/characters` → `pages/admin/characters-list.eta`:
  - Searchable, paginated table (compact, not cards): traditional, simplified, pinyin, zhuyin, HSK, #sentences, Edit / Delete.
  - "New character" button → `/admin/characters/new` (form built in step 13).
  - Delete = small POST form per row → `POST /admin/characters/:id/delete` (cascades sentences); confirm via Alpine before submit; flash message on success.
- [ ] Admin layout: a distinct admin nav/sub-header (still themed) so it's clearly the admin area.

## Files created

- `src/server/routes/admin.ts`
- `views/pages/admin/dashboard.eta`, `views/pages/admin/characters-list.eta`
- `views/layouts/admin.eta` (or an admin nav partial)

## Acceptance criteria

- Only `admin` reaches `/admin*`; test user gets 403.
- Dashboard shows accurate counts; list is searchable and paginated.
- Delete removes the character and its sentences, with a confirm + flash.

## How to verify

```bash
pnpm dev   # as admin
# /admin → counts match DB. /admin/characters → search, paginate.
# Delete a throwaway character → row gone, sentences cascade.
```
