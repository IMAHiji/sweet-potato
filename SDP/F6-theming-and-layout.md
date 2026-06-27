# F6 — Theming + base layout (Sunny + Dark, rounded UI)

**Phase:** 0 — Foundation (sequential). **Depends on:** F3 (layout/render), F2 (SCSS pipeline).

**Goal:** A polished base layout with two AA-contrast themes, a working theme toggle, the
reusable rounded UI components every lane uses, the shared partials, and the **pre-stubbed nav
+ per-lane SCSS stubs** that keep lanes from editing shared files.

## Tasks

- [ ] `styles/tokens.scss`: design tokens as CSS custom properties under `:root` — spacing scale, radii (`--radius-sm/md/lg/pill`), shadows, font stacks (CJK-friendly: `"Noto Sans TC", "PingFang TC", system-ui`), font sizes incl. a large `--fs-char` for the big character.
- [ ] `styles/themes.scss`: color tokens for `[data-theme="sunny"]` and `[data-theme="dark"]`.
  - **Sunny (AA-safe):** `--bg #FFF8F0`, `--surface #FFFFFF`, `--primary #b05828`, `--accent #4f7a3d`, `--danger #b8402f`, `--text #3A2E27`, `--text-muted #6f6052`.
  - **Dark:** `--bg #1E1A24`, `--surface #2A2433`, `--primary #F0935A`, `--accent #8FBF7A`, `--text #EDE6DE`.
  - These sunny values are chosen to **pass WCAG AA** (the prior build failed AA here — do not regress).
- [ ] `styles/components.scss`: rounded components — `.btn` (+ `--primary/ghost/danger`), `.card`, `.input`, `.select`, `.badge` (HSK pills), `.nav`, `.toggle`, `.grid`, `.flashcard`, **`.speak-btn`** (the 🔊 control, used by F9's partial). Generous radii; `:focus-visible` outlines.
- [ ] `styles/main.scss`: `@use` tokens/themes/components **and the lane stubs** `@use 'lanes/browse'; @use 'lanes/study'; @use 'lanes/admin';`. Base resets.
- [ ] **Create empty lane SCSS stubs** `styles/lanes/_browse.scss`, `_study.scss`, `_admin.scss` (a one-line `// filled by Lane A/B/C` comment each). Lanes fill these; `main.scss` never changes again.
- [ ] `components/theme.ts`: Alpine component — read saved theme from `localStorage`, else `prefers-color-scheme`; set `document.documentElement.dataset.theme`; `toggle()` flips + persists. Apply theme **before paint** via a tiny inline `<head>` script (no FOUC). Register it in `main.ts`.
- [ ] `views/partials/nav.eta` (**pre-stub all links**): brand, theme toggle, and — gated by `currentUser` — **Browse `/characters`**, **Study `/study`**, role-gated **Admin `/admin`**, user name, Logout; Login when logged out. Lanes never touch this file.
- [ ] `views/partials/flash.eta` + `views/partials/empty-state.eta` (friendly, reused by auth/admin/lanes).
- [ ] `base.eta`: add the no-FOUC script, the nav partial, a themed content container, footer.

## Files created

- `styles/{tokens,themes,components,main}.scss`; `styles/lanes/{_browse,_study,_admin}.scss` (stubs)
- `components/theme.ts`
- updated `base.eta`; new `views/partials/{nav,flash,empty-state}.eta`

## Acceptance criteria

- Toggling theme switches Sunny⇄Dark instantly and persists across reloads; no FOUC.
- Buttons/cards/inputs visibly rounded and consistent in both themes.
- Nav already shows Browse/Study/Admin links (Admin only for admins) — lanes just implement the targets.
- `main.scss` compiles with the empty lane stubs present.

## How to verify

```bash
pnpm dev
# Toggle theme, reload — choice sticks. DevTools: <html data-theme> changes. Throttle + hard reload — no FOUC.
```
