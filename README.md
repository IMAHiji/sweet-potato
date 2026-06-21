# Sweet Potato (蕃薯) 🍠

A web app for studying Chinese characters: browse a graded character database, see
**simplified + traditional** forms with **pinyin + zhuyin**, study with flashcards, and
(as admin) edit entries and example sentences.

> **Status: built.** The full app is implemented per the spec in `SDP/`. Get it running
> locally with the [Quickstart](#quickstart) below.

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

## Quickstart

Requires **Node ≥ 24**, **pnpm**, and **Docker** (for local Postgres).

```bash
cp .env.example .env   # then edit: set SESSION_SECRET + admin/test creds
pnpm install
pnpm db:up             # local Postgres via docker-compose
pnpm db:migrate        # apply schema
pnpm data:download     # fetch HSK list + CC-CEDICT into scripts/data/ (gitignored)
pnpm seed              # load HSK 1–3 characters + seed admin & test users
pnpm dev               # Fastify + Vite (HMR) → http://localhost:3000
```

Generate a session secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Then log in at `/login` with the admin or test-user credentials from your `.env`.

### Useful scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Vite (HMR) + Fastify (tsx watch) |
| `pnpm build` | Build client assets + compile server to `dist/` |
| `pnpm start` | Run the compiled server (`NODE_ENV=production`) |
| `pnpm typecheck` / `pnpm lint` | Strict TS + ESLint gates |
| `pnpm test:zhuyin` | Verify the pinyin→zhuyin converter |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle migrations + studio |
| `pnpm data:download [--force]` · `pnpm seed` | Fetch source data · seed DB |

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string |
| `DATABASE_SSL` | _(optional)_ force Postgres SSL `true`/`false` (default: on in prod) |
| `SESSION_SECRET` | key for sealed-cookie sessions (≥32 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `HSK_LEVELS` | seed range (default `1-3`) |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` / `production` |

## Deploy

The app runs as **one process** that serves SSR HTML, the JSON API, and built
static assets. A multi-stage `Dockerfile` builds the client + server; on start it
runs migrations then launches the server. `render.yaml` provisions a Docker web
service + managed Postgres.

**Render (blueprint):** push this repo, create a new Blueprint from `render.yaml`,
and set the secret env vars (`SESSION_SECRET`, `ADMIN_*`, `TEST_USER_*`) in the
dashboard. `DATABASE_URL` is wired from the managed DB automatically; migrations
run on every deploy.

**Railway:** create a project → add the PostgreSQL plugin → deploy this repo
(Railway builds the Dockerfile, or auto-detects Node) → set the env vars. Migrations
run on start.

**Docker (anywhere):**

```bash
docker build -t sweet-potato .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://… -e SESSION_SECRET=… \
  -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… \
  -e TEST_USER_EMAIL=… -e TEST_USER_PASSWORD=… \
  sweet-potato
```

**Seeding in prod is a one-off** (migrations run automatically, seeding does not):
run `pnpm data:download && pnpm seed` once via the platform's shell/job. Production
hardening is on by default in `NODE_ENV=production`: secure cookies, SSL to Postgres,
`trustProxy`.

## Project structure

```
src/
  server/   Fastify app: index.ts, env.ts, plugins/, routes/, db/ (schema + migrations + migrate.ts), lib/, views/ (Eta)
  client/   Alpine entry (main.ts), components/ (theme, toggles, flashcard, admin-forms), styles/ (SCSS tokens + themes)
scripts/    download-data.ts, seed.ts (HSK + CC-CEDICT → characters; seed users), test-zhuyin.ts
public/     Vite build output (served by Fastify at /assets)
SDP/        the build plan
```

## Roadmap / out of scope (next phases)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · audio pronunciation.

---

_Data sources: characters and definitions derive from the open
[CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) dictionary and an open
HSK word list; zhuyin is derived programmatically from pinyin._
