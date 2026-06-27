# A2 — Character detail page

**Phase:** 1 — Lane A (reading). **Depends on:** A1 (route module, page conventions), Foundation (F5 sentences type, F9 `audio`).

**Goal:** `/characters/:id` shows the full entry — large character (both scripts), pinyin,
zhuyin, definition, example sentences (feature #8), each with 🔊.

## Owns (only these files)

- updated `src/server/routes/characters.ts` (adds the `:id` route)
- `views/pages/character-detail.eta`, `views/partials/sentence-item.eta`
- (extends `tests/characters.test.ts`)

## Tasks

- [ ] `GET /characters/:id` (`app.requireUser`) in `characters.ts`:
  - Fetch the character; styled **404** if missing. Fetch its `example_sentences` ordered by `sortOrder, id`.
  - Render `pages/character-detail.eta`.
- [ ] `pages/character-detail.eta`:
  - Hero: very large character (`--fs-char`); show both simplified + traditional, labeled; respect `$store.display.script`. A 🔊 (`speak-button`) on the character.
  - Pinyin + zhuyin together, per `$store.display.notation` (from F9).
  - Definition block.
  - **Example sentences** via `sentence-item` partial: traditional/simplified (per toggle), pinyin/zhuyin (per toggle), English translation, and a 🔊 on each sentence. Friendly empty state ("No example sentences yet") when none.
  - Back-to-browse + "Study this set" links; if `currentUser.role === 'admin'`, an **Edit** link to `/admin/characters/:id/edit` (Lane C builds the target).
- [ ] `partials/sentence-item.eta`: one sentence row + its `speak-button`.
- [ ] Reuse `$store.display` so prefs match the browse page. Prev/next within the HSK level is a nice-to-have (note only).
- [ ] Extend `tests/characters.test.ts`: `:id` returns the character + ordered sentences; missing id → 404.

## Acceptance criteria

- Detail page shows character, pinyin, zhuyin, definition, and any sentences; toggles behave exactly like browse.
- 🔊 pronounces the character and each sentence (when a zh voice exists).
- Admins see Edit; regular users do not. Missing id → styled 404.

## How to verify

```bash
pnpm dev
# Open a card → detail. Toggle script/notation. Click 🔊 on the character and a sentence.
# (After Lane C + G2) add a sentence as admin → appears here.
pnpm test characters
```
