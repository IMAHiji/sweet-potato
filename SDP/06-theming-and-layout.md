# Step 06 — Theming + base layout (Sunny + Dark, rounded UI)

**Goal:** A polished base layout with two themes and a working theme toggle, plus a
small set of reusable rounded UI components used across all later pages.

**Depends on:** 03 (layout/render), 02 (SCSS pipeline).

## Tasks

- [ ] `src/client/styles/tokens.scss`: design tokens as CSS custom properties under `:root` — spacing scale, radii (`--radius-sm/md/lg/pill`), shadows, font stacks (include a CJK-friendly stack, e.g. `"Noto Sans TC", "PingFang TC", system-ui`), font sizes (with a large `--fs-char` for the big character display).
- [ ] `src/client/styles/themes.scss`: color tokens for `[data-theme="sunny"]` and `[data-theme="dark"]`:
  - **Sunny:** `--bg #FFF8F0`, `--surface #FFFFFF`, `--primary #E07A3F`, `--accent #7FB069`, `--text #3A2E27`, soft shadows.
  - **Dark:** `--bg #1E1A24`, `--surface #2A2433`, `--primary #F0935A`, `--accent #8FBF7A`, `--text #EDE6DE`.
- [ ] `src/client/styles/components.scss`: rounded components — `.btn` (+ `.btn--primary/ghost/danger`), `.card`, `.input`, `.select`, `.badge` (HSK level pills), `.nav`, `.toggle`, `.grid`, `.flashcard`. Generous radii; focus-visible outlines for a11y.
- [ ] `src/client/styles/main.scss`: `@use` the four files; base resets.
- [ ] `src/client/components/theme.ts`: Alpine component — reads saved theme from `localStorage`, else `prefers-color-scheme`; sets `document.documentElement.dataset.theme`; `toggle()` flips + persists. Apply theme **before paint** via a tiny inline script in `<head>` to avoid FOUC.
- [ ] `base.eta`: add the inline no-FOUC theme script, the theme toggle button in nav, and a content container. Pass `currentUser` into nav (login/logout links wired in step 07).
- [ ] Add a simple, friendly empty-state and flash-message partial (reused by admin + auth).

## Files created

- `src/client/styles/{tokens,themes,components,main}.scss`
- `src/client/components/theme.ts`
- updated `base.eta`, new `views/partials/{flash,empty-state}.eta`

## Acceptance criteria

- Toggling theme switches Sunny⇄Dark instantly and persists across reloads.
- No flash of wrong theme on load (no-FOUC script works).
- Buttons/cards/inputs are visibly rounded and consistent in both themes.

## How to verify

```bash
pnpm dev
# Toggle theme, reload — choice sticks. DevTools: <html data-theme> changes.
# Throttle + hard reload — no FOUC.
```
