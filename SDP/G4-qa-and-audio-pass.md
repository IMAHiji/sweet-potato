# G4 — QA checklist + audio & accessibility pass

**Phase:** 2 — Integration (sequential). **Depends on:** G1–G3.

**Goal:** End-to-end verification, code-quality gates, an **audio cross-browser/voice pass**, and
accessibility before calling the first build done.

## Automated gates

- [ ] `pnpm typecheck` · `pnpm lint` · `pnpm test` (all lane specs + zhuyin + audio) · `pnpm build` — all clean.

## End-to-end manual script

Fresh DB: `rm -f data/*.db* && pnpm db:migrate && pnpm seed && pnpm dev`.

- [ ] **Home/theme:** `/` renders; theme toggle persists; no FOUC.
- [ ] **Auth:** log in as admin and (separately) test user; bad password → generic error; logout clears session.
- [ ] **Authz:** test user → `/admin` = 403; anonymous → `/characters`, `/study`, `/admin` redirect to `/login`.
- [ ] **Browse:** grid; search (incl. **toneless pinyin** via `pinyin_search`); HSK filter; pagination preserves filters; script + notation toggles instant + persistent.
- [ ] **Detail:** character, pinyin, zhuyin, definition, sentences; toggles consistent; bad id → 404.
- [ ] **Study:** deck loads; flip; Known/Again advance; end summary; keyboard; each rating writes a `reviews` row.
- [ ] **Admin CRUD:** create (derive zhuyin) → appears in browse + searchable by toneless pinyin; edit → reflected on detail; duplicate `traditional` → friendly error; add/edit/delete sentences → reflected on public detail; delete character → cascades sentences.

## Audio pass (new)

- [ ] 🔊 on browse cards, character detail (character + each sentence), and flashcards all speak via a Chinese voice.
- [ ] Auto-play-on-flip works in study and persists.
- [ ] **No-voice fallback:** with Chinese voices disabled/absent, the 🔊 button is hidden/disabled with a tooltip — no errors, app still usable.
- [ ] **Cross-browser:** verify Chrome (async `voiceschanged`), Safari/macOS (good zh-TW voice), and note iOS Safari's user-gesture requirement. Document which voices were available where.
- [ ] Voice-picker (when >1 zh voice) selects the speaking voice; preference persists.

## Accessibility & polish

- [ ] **Color contrast AA in both themes** (verify the sunny tokens from F6 actually pass — the prior build regressed here).
- [ ] Keyboard: all interactive elements focusable; visible focus ring; flashcard fully keyboard-usable; 🔊 reachable + labeled.
- [ ] Forms have labels; errors associated; buttons have accessible names.
- [ ] CJK font crisp at `--fs-char`; comfortable line-height. Responsive: grid + flashcard usable on mobile.
- [ ] Friendly empty states everywhere (no results, no sentences, empty deck, no audio voice).

## Sign-off

- [ ] All 8 requested features work, plus flashcards **and audio**.
- [ ] Deploy dry-run (G3) succeeds incl. volume persistence.
- [ ] Commit + push; offer to push unpushed commits (per global prefs).

## How to verify

Work top-to-bottom on a fresh database across at least two browsers; everything checked = first build complete.
