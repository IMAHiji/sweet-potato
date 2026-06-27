# B2 — Flashcard component (+ audio)

**Phase:** 1 — Lane B (study). **Depends on:** B1 (page + deck JSON), Foundation (F9 `flashcard` **stub**, `display`, `audio`).

**Goal:** Fill the `flashcard` Alpine stub: flip, shuffle, mark known/again, keyboard, audio,
end-of-deck summary.

## Owns (only these files)

- **fills** `src/client/components/flashcard.ts` (the F9 stub — do not change its registration in `main.ts`)
- (extends `tests/study.test.ts` or adds `tests/flashcard.test.ts`)

## Tasks

- [ ] `components/flashcard.ts`: read the deck JSON; hold `deck`, `index`, `flipped`, tallies.
  - **Front:** the character (script per `$store.display`). Click/tap or **Space** → flip.
  - **Back:** pinyin, zhuyin, definition (notation per `$store.display`).
  - **Buttons:** Known / Again → advance + `POST /api/reviews` (B3); do **not** block the UI on the response (fire-and-forget, tolerate failure).
  - **Audio:** a 🔊 to speak the current character; if `$store.audio.autoPlay`, speak on flip. Use `$store.audio.speak(...)`. (iOS: speaking on the flip click is a valid user gesture.)
  - Shuffle button; progress `7 / 30`; end-of-deck summary (known vs again) with Restart / New deck.
  - Keyboard: Space flip, `1` = again, `2` = known, ← / → prev/next.
- [ ] Reuse `$store.display` + `$store.audio` (no private copies).
- [ ] Tests: pure deck logic (advance, shuffle determinism with seeded RNG if used, tally counts, end-of-deck detection).

## Acceptance criteria

- Deck loads; cards flip; Known/Again advance and reach an end-of-deck summary.
- Each Known/Again triggers a `POST /api/reviews` (B3).
- Shuffle reorders; keyboard shortcuts work; toggles affect front/back; 🔊 / auto-play speak the character.

## How to verify

```bash
pnpm dev   # logged in
# /study → flip, mark Known/Again to the end. Toggle auto-play → hear each card on flip. Keyboard 1/2/Space/arrows.
pnpm test
```
