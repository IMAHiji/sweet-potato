# Step 14 — Admin example-sentence management

**Goal:** Add/edit/delete example sentences for a character from its edit page
(feature #8 — sentences are admin-entered).

**Depends on:** 13 (character edit page), 05 (`example_sentences`).

## Tasks

- [ ] Routes in `admin.ts` (under `requireAdmin`):
  - `POST /admin/characters/:id/sentences` → add a sentence to that character.
  - `POST /admin/sentences/:id` → update.
  - `POST /admin/sentences/:id/delete` → delete.
  - Each redirects back to the character edit page with a flash.
- [ ] Zod schema: `traditional`, `simplified`, `translation` required; `pinyin`, `zhuyin`, `notes` optional; `sort_order` optional int.
- [ ] Sentences section on `pages/admin/character-form.eta` (edit mode only):
  - List existing sentences with inline edit + delete (Alpine: expand/collapse a row into editable fields).
  - "Add sentence" form (Alpine `admin-forms.ts` extended).
  - Optional "derive zhuyin from pinyin" per sentence (reuse step 13 helper).
  - Reorder via `sort_order` (simple number input; drag-reorder is a nice-to-have, note only).
- [ ] Ensure deletes are scoped to the parent character (no cross-character edits).

## Files created

- updated `src/server/routes/admin.ts`
- updated `views/pages/admin/character-form.eta`
- updated `src/client/components/admin-forms.ts`

## Acceptance criteria

- Admin can add, edit, and delete sentences on a character's edit page.
- Saved sentences appear (ordered by `sort_order`) on the public `/characters/:id` page.
- Deleting a character still cascades its sentences (from step 05 FK).

## How to verify

```bash
pnpm dev   # as admin
# Edit a character → add 2 sentences with translations → save.
# Open /characters/:id → both sentences render in order.
# Edit one, delete the other → detail page reflects changes.
```
