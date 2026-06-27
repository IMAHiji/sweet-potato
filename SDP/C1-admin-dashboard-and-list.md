# C1 — Admin dashboard + character list

**Phase:** 1 — Lane C (admin). **Depends on:** Foundation (F3, F5, F6, F7 `requireAdmin`). **Then:** C2, C3.

**Goal:** Admin-only `/admin` dashboard with counts, and `/admin/characters` listing all
characters with search + edit/delete.

## Owns (only these files — shared across C1–C3)

- `src/server/routes/admin.ts`
- `views/pages/admin/{dashboard,characters-list}.eta`, `views/partials/admin-bar.eta`
- fills `styles/lanes/_admin.scss`
- `tests/admin.test.ts`

## Tasks

- [ ] `routes/admin.ts` (autoloaded): register everything under the `/admin` prefix in one
  plugin scope with `app.requireAdmin` as a scope-wide `preHandler` (every admin route guarded).
- [ ] `GET /admin` → `pages/admin/dashboard.eta`: counts (characters total + per HSK level, sentences, users, reviews) + quick links.
- [ ] `GET /admin/characters` → `pages/admin/characters-list.eta`: searchable, paginated **table** (compact, not cards): traditional, simplified, pinyin, zhuyin, HSK, #sentences, Edit / Delete. "New character" button → `/admin/characters/new` (form in C2).
- [ ] Delete = per-row POST → `POST /admin/characters/:id/delete` (cascades sentences via FK); Alpine `confirm` before submit; flash on success.
- [ ] `partials/admin-bar.eta`: a distinct admin sub-header (still themed) so the admin area is obvious. `_admin.scss`: table styling.
- [ ] `tests/admin.test.ts`: `requireAdmin` blocks `user`/anonymous (403/redirect); dashboard counts match seeded rows; delete removes character + cascades sentences.

## Acceptance criteria

- Only `admin` reaches `/admin*`; test user → 403.
- Dashboard counts are accurate; list is searchable + paginated.
- Delete removes the character and its sentences, with confirm + flash.

## How to verify

```bash
pnpm seed:dev && pnpm dev   # as admin
# /admin → counts. /admin/characters → search, paginate, delete a throwaway row (sentences cascade).
pnpm test admin
```
