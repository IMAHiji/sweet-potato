# Step 16 — QA checklist + final polish

**Goal:** End-to-end verification, code-quality gates, and an accessibility pass before
calling the first build done.

**Depends on:** 01–15.

## Automated gates

- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm test:zhuyin` — passes.
- [ ] `pnpm build` — Vite assets + `tsc` succeed; `dist/` and `public/` produced.

## End-to-end manual script

Run against a fresh DB: `pnpm db:up && pnpm db:migrate && pnpm seed && pnpm dev`.

- [ ] **Home** `/` renders; theme toggle works; choice persists; no FOUC.
- [ ] **Auth:** log in as **admin** and (separately) as **test user** with seeded creds. Bad password → generic error. Logout clears session.
- [ ] **Authz:** test user hitting `/admin` → 403. Anonymous hitting `/characters`, `/study`, `/admin` → redirected to `/login`.
- [ ] **Browse** `/characters`: grid renders; search works; HSK filter works; pagination preserves filters; simplified⇄traditional and pinyin⇄zhuyin toggles switch instantly and persist.
- [ ] **Detail** `/characters/:id`: shows character, pinyin, zhuyin, definition, sentences; toggles consistent; bad id → 404.
- [ ] **Study** `/study`: deck loads; flip; Known/Again advance; end summary; keyboard shortcuts; each rating writes a `reviews` row.
- [ ] **Admin CRUD:** create a character (derive zhuyin) → appears in browse; edit it → reflected on detail; duplicate `traditional` → friendly error; add/edit/delete sentences → reflected on public detail; delete character → cascades sentences.

## Accessibility & polish pass

- [ ] Color contrast AA in **both** themes (text on bg/surface, primary buttons).
- [ ] Keyboard: all interactive elements focusable; visible focus ring; flashcard usable by keyboard.
- [ ] Forms have labels; errors are announced/associated; buttons have accessible names.
- [ ] CJK font renders crisply at the large character size; line-height comfortable.
- [ ] Responsive: browse grid and flashcard usable on mobile widths.
- [ ] Friendly empty states everywhere (no results, no sentences, empty deck).

## Sign-off

- [ ] All 8 requested features demonstrably work, plus flashcards.
- [ ] Deploy dry-run (step 15) succeeds.
- [ ] Commit + push; open repo. (Offer to push unpushed commits per global prefs.)

## How to verify

Work top-to-bottom through the checklist on a fresh database; everything checked = first build complete.
