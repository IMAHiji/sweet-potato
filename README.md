# Sweet Potato (蕃薯) 🍠

A web app for studying Chinese characters: browse a graded character database, see
**simplified + traditional** forms with **pinyin + zhuyin**, study with flashcards, and
(as admin) edit entries and example sentences.

> **Status: planning stage.** This repository currently contains the **build spec only**
> (the `SDP/` folder). No application code has been written yet — the app is built by
> working through the numbered steps in `SDP/`. See [Building the app](#building-the-app).

---

## What it does

- **Graded character database** — seeded from an open HSK word list (default **HSK 1–3**, ~600–900 single characters), cross-referenced with CC-CEDICT for traditional forms and definitions.
- **Both scripts, both notations** — every entry shows simplified + traditional and pinyin + zhuyin, with instant client-side toggles.
- **Character detail pages** — large character, pinyin, zhuyin, definition, and admin-entered example sentences.
- **Flashcard study mode** — pick a deck (by HSK level or all), flip, shuffle, mark known/again. Reviews are logged (spaced-repetition scheduling is a later phase).
- **Two logins, two roles** — an **admin** (manage characters + sentences) and a non-admin **test user** (study only). The test user is blocked from all admin routes.
- **Admin editing** — create/edit/delete characters and their example sentences from the admin panel.
- **Two themes, rounded UI** — a happy **Sunny** (light) theme and a **Dark** theme, toggleable and remembered.

## Planned stack

| Layer | Choice |
|-------|--------|
| Runtime | Node 24 LTS · TypeScript (strict) · ESM · pnpm |
| Web framework | **Fastify** — one process serves SSR HTML + JSON API + built static assets |
| Templating | **Eta** via `@fastify/view` (mostly-static server-rendered HTML) |
| Interactivity | **Alpine.js** (theme toggle, script/notation toggles, flashcards, admin forms) |
| Assets / styling | **Vite + Sass** (bundling, HMR, the two themes) |
| Database | **PostgreSQL** + **Drizzle ORM** (`pg` driver) |
| Auth | `@fastify/secure-session` (sealed cookie) + `crypto.scrypt` hashing; roles `admin` / `user` |
| Deploy | Railway / Render (managed Postgres); portable Dockerfile + `render.yaml` |

## Building the app

The full, step-by-step spec lives in **[`SDP/`](SDP/)**. Start with
[`SDP/00-overview.md`](SDP/00-overview.md) (architecture, data model, routes), then work
through the numbered steps **in order** — each file has a goal, a small task checklist,
the files it touches, acceptance criteria, and how to verify it.

| Step | Focus |
|------|-------|
| 01–05 | Scaffold → Vite/Sass → Fastify → Postgres/Drizzle → schema (sequential foundation) |
| 06–08 | Theming + layout · auth + roles · HSK character seed |
| 09–11 | Character browse · character detail · flashcard study |
| 12–14 | Admin dashboard + list · character editor · example-sentence CRUD |
| 15–16 | Deploy (Railway/Render + Docker) · end-to-end QA checklist |

## Quickstart _(available once the app is built — see step 01)_

```bash
pnpm install
pnpm db:up          # local Postgres via docker-compose
pnpm db:migrate     # apply schema
pnpm seed           # load HSK 1–3 characters + seed admin & test users
pnpm dev            # Fastify + Vite (HMR) → http://localhost:3000
```

Copy `.env.example` → `.env` and fill in the values first.

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | key for sealed-cookie sessions (≥32 bytes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `HSK_LEVELS` | seed range (default `1-3`) |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` / `production` |

## Project structure _(target — created as the steps are built)_

```
src/
  server/   Fastify app: index.ts, plugins/, routes/, db/ (schema + migrations), lib/, views/ (Eta)
  client/   Alpine entry (main.ts), components/, styles/ (SCSS tokens + themes)
scripts/    download-data.ts, seed.ts (HSK + CC-CEDICT → characters; seed users)
public/     Vite build output (served by Fastify)
SDP/        ← this build plan (the only thing present today)
```

## Roadmap / out of scope (next phases)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · audio pronunciation.

---

_Data sources: characters and definitions derive from the open
[CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) dictionary and an open
HSK word list; zhuyin is derived programmatically from pinyin._
