# Step 10 — Character detail page

**Goal:** `/characters/:id` shows the full entry — large character (both scripts),
pinyin, zhuyin, definition, and its example sentences (feature #8).

**Depends on:** 09 (route module, toggles), 05 (sentences table).

## Tasks

- [ ] `GET /characters/:id` (guard: `requireUser`) in `characters.ts`:
  - Fetch the character; 404 (styled) if missing.
  - Fetch its `example_sentences` ordered by `sort_order, id`.
  - Render `pages/character-detail.eta`.
- [ ] `pages/character-detail.eta`:
  - Hero: very large character (uses `--fs-char`); show both simplified + traditional (respect the script toggle, but also label which is which).
  - Pinyin + zhuyin shown together, with the same notation toggle from step 09.
  - Definition block.
  - **Example sentences** list: each sentence shows traditional/simplified (per toggle), pinyin/zhuyin (per toggle), and the English translation; friendly empty state ("No example sentences yet") when none.
  - "Study this set" / back-to-browse links; if `currentUser.role==='admin'`, an "Edit" link to the admin editor.
- [ ] Reuse `toggles.ts` store so script/notation prefs are consistent with the browse page.
- [ ] Add prev/next navigation within the current HSK level (optional, nice-to-have).

## Files created

- `views/pages/character-detail.eta`
- `views/partials/sentence-item.eta`
- updated `src/server/routes/characters.ts`

## Acceptance criteria

- Detail page shows character, pinyin, zhuyin, definition, and any example sentences.
- Script/notation toggles behave identically to the browse page.
- Admins see an Edit link; regular users do not. Missing id → styled 404.

## How to verify

```bash
pnpm dev
# Open a card → detail page. Toggle script/notation.
# (After step 14) add a sentence as admin → it appears here.
```
