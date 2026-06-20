# Step 13 — Admin character editor (create / edit / delete)

**Goal:** Admin forms to create and edit a character (feature #7), with validation
and a zhuyin auto-derive helper.

**Depends on:** 12 (admin scope + list), 08 (`lib/zhuyin.ts`).

## Tasks

- [ ] Routes in `admin.ts` (all under `requireAdmin`):
  - `GET /admin/characters/new` → empty editor form.
  - `POST /admin/characters` → validate (Zod), insert, redirect to the edit page with a success flash.
  - `GET /admin/characters/:id/edit` → editor populated with the character (and its sentences section from step 14).
  - `POST /admin/characters/:id` → validate, update, set `updated_at`, flash.
  - `POST /admin/characters/:id/delete` → (already in step 12).
- [ ] Zod schema: `traditional`, `simplified`, `pinyin`, `zhuyin` required; `definition` required; `hsk_level` optional int; `frequency_rank` optional int. Unique-violation on `traditional` → friendly field error (not a 500).
- [ ] `pages/admin/character-form.eta` + `src/client/components/admin-forms.ts` (Alpine):
  - Inline validation + dirty-state warning on navigate-away.
  - **"Derive zhuyin from pinyin"** button → calls a tiny endpoint `POST /admin/derive-zhuyin` (or reuse a client port of the mapping) to fill the zhuyin field from pinyin.
  - Submit via standard POST (progressive enhancement: works without JS).
- [ ] Reuse the form template for both create and edit (mode flag).

## Files created

- `views/pages/admin/character-form.eta`
- `src/client/components/admin-forms.ts`
- updated `src/server/routes/admin.ts`

## Acceptance criteria

- Admin can create a new character; it appears in the list and on `/characters`.
- Admin can edit fields and save; changes persist and show on the public detail page.
- Duplicate `traditional` shows a friendly validation error.
- Zhuyin derive button fills the field correctly from pinyin.

## How to verify

```bash
pnpm dev   # as admin
# New character → fill, derive zhuyin, save → shows in /characters.
# Edit definition → save → reflected on /characters/:id.
# Create duplicate traditional → inline error, no crash.
```
