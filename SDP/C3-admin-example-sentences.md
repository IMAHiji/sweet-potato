# C3 — Admin example-sentence management

**Phase:** 1 — Lane C (admin). **Depends on:** C2 (character edit page + `admin-forms.ts`), Foundation (F5 `example_sentences`).

**Goal:** Add/edit/delete example sentences for a character from its edit page (feature #8 —
sentences are admin-entered).

## Owns (only these files)

- updated `src/server/routes/admin.ts`
- updated `views/pages/admin/character-form.eta`; new `views/partials/sentence-fields.eta`
- updated `src/client/components/admin-forms.ts`
- (extends `tests/admin.test.ts`)

## Tasks

- [ ] Routes in `admin.ts` (under `requireAdmin`), each redirecting back to the character edit page with a flash:
  - `POST /admin/characters/:id/sentences` → add a sentence to that character.
  - `POST /admin/sentences/:id` → update (set `updatedAt`).
  - `POST /admin/sentences/:id/delete` → delete.
  - Scope every sentence op to its parent character (no cross-character edits).
- [ ] Zod: `traditional`, `simplified`, `translation` required; `pinyin`, `zhuyin`, `notes` optional; `sortOrder` optional int.
- [ ] Sentences section on `character-form.eta` (**edit mode only**) + `partials/sentence-fields.eta`:
  - List existing sentences with inline edit + delete (Alpine: expand a row into editable fields).
  - "Add sentence" form (extend `admin-forms.ts`).
  - Optional per-sentence "derive zhuyin from pinyin" (reuse the C2 `/admin/derive-zhuyin` endpoint).
  - Reorder via `sortOrder` number input (drag-reorder is a nice-to-have, note only).
- [ ] Tests: add/update/delete a sentence; deleting the character cascades its sentences (FK from F5); cross-character edit is rejected.

## Acceptance criteria

- Admin can add/edit/delete sentences on a character's edit page.
- Saved sentences appear (ordered by `sortOrder`) on public `/characters/:id` (Lane A).
- Deleting a character cascades its sentences.

## How to verify

```bash
pnpm dev   # as admin
# Edit a character → add 2 sentences w/ translations → save. Open /characters/:id → both render in order.
# Edit one, delete the other → detail reflects changes.
pnpm test admin
```
