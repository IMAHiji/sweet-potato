# Step 11 — Flashcard study mode

**Goal:** A simple `/study` flashcard screen: pick a deck (HSK level or all), flip
cards, shuffle, and mark known/again — logging each review. No SRS scheduling yet.

**Depends on:** 09 (data + toggles), 07 (auth), 05 (reviews table).

## Tasks

- [ ] `GET /study` (guard: `requireUser`) in `src/server/routes/study.ts`:
  - Query `level` (optional) and `limit` (default ~30). Fetch a shuffled deck (`order by random() limit n`) of characters for the level (or all).
  - Render `pages/study.eta` with the deck serialized into a `<script type="application/json">` for the Alpine component.
- [ ] `src/client/components/flashcard.ts`: Alpine component holding the deck + index.
  - Front: the character (script per toggle). Tap/click or Space → flip.
  - Back: pinyin, zhuyin, definition (notation per toggle).
  - Buttons: **Known** and **Again**; both advance to the next card and `POST /api/reviews`.
  - Shuffle button; progress indicator (`7 / 30`); end-of-deck summary (known vs again counts) with "restart" / "new deck".
  - Keyboard: Space flip, `1`=again, `2`=known, arrows for prev/next.
- [ ] `POST /api/reviews` (guard: `requireUser`) in `src/server/routes/api.ts`:
  - Zod body `{ characterId: number, rating: 'known'|'again' }`; insert a `reviews` row for `request.user.id`; return `{ ok: true }`. Don't block the UI on the response.
- [ ] Deck picker UI on `/study` (level select + start).
- [ ] Reuse the `toggles.ts` store for script/notation consistency.

## Files created

- `src/server/routes/study.ts`, `src/server/routes/api.ts`
- `views/pages/study.eta`
- `src/client/components/flashcard.ts`

## Acceptance criteria

- A deck loads; cards flip; Known/Again advance and reach an end-of-deck summary.
- Each Known/Again writes a `reviews` row attributed to the current user.
- Shuffle reorders; keyboard shortcuts work; toggles affect front/back display.

## How to verify

```bash
pnpm dev   # logged in
# /study → pick HSK 1 → flip, mark Known/Again to the end.
psql $DATABASE_URL -c 'select rating, count(*) from reviews group by 1;'
```
