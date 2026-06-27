# C2 — Admin character editor (create / edit / delete)

**Phase:** 1 — Lane C (admin). **Depends on:** C1 (admin scope + list), Foundation (F8 `pinyinToZhuyin`+`stripTones`, F9 `admin-forms` **stub**).

**Goal:** Admin forms to create and edit a character (feature #7), with validation, a
zhuyin-derive helper, and correct `pinyinSearch` maintenance.

## Owns (only these files)

- updated `src/server/routes/admin.ts`
- `views/pages/admin/character-form.eta`
- **fills** `src/client/components/admin-forms.ts` (the F9 stub)
- (extends `tests/admin.test.ts`)

## Tasks

- [ ] Routes in `admin.ts` (all under `requireAdmin`):
  - `GET /admin/characters/new` → empty editor.
  - `POST /admin/characters` → Zod-validate, insert, **compute `pinyinSearch = stripTones(pinyin)`** (F8), redirect to the edit page with a success flash.
  - `GET /admin/characters/:id/edit` → editor populated (+ the sentences section from C3).
  - `POST /admin/characters/:id` → validate, update, **recompute `pinyinSearch`**, set `updatedAt = new Date()` (no DB auto-update in SQLite), flash.
  - `POST /admin/derive-zhuyin` → body `{ pinyin }` → `{ zhuyin: pinyinToZhuyin(pinyin) }` (used by the form button).
- [ ] Zod: `traditional`, `simplified`, `pinyin`, `zhuyin`, `definition` required; `hskLevel`, `frequencyRank` optional int. **Unique-violation on `traditional`** → friendly field error, not a 500 (in `better-sqlite3` the error is `SQLITE_CONSTRAINT_UNIQUE` — detect on `err.code`).
- [ ] `pages/admin/character-form.eta` + fill `components/admin-forms.ts`:
  - Inline validation + dirty-state warn on navigate-away.
  - **"Derive zhuyin from pinyin"** button → `POST /admin/derive-zhuyin` → fills the zhuyin field.
  - Standard POST submit (progressive enhancement: works without JS).
  - Reuse the template for create + edit (mode flag).
- [ ] Tests: create persists with correct `pinyinSearch`; duplicate `traditional` → friendly error not 500; derive-zhuyin returns expected mapping.

## Acceptance criteria

- Admin can create + edit characters; changes persist and show on `/characters` + detail.
- Duplicate `traditional` → friendly validation error (no crash).
- Derive-zhuyin button fills the field; `pinyinSearch` is kept in sync so search works.

## How to verify

```bash
pnpm dev   # as admin
# New character → fill, derive zhuyin, save → shows in /characters (search by toneless pinyin works).
# Edit definition → save → reflected on /characters/:id. Duplicate traditional → inline error.
pnpm test admin
```
