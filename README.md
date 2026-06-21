# Sweet Potato (地瓜) 🍠

A web app for studying Chinese characters: browse a graded character database, see
**simplified + traditional** forms with **pinyin + zhuyin**, study with flashcards, and
(as admin) edit entries and example sentences.

> **Status: built.** The full app is implemented per the spec in `SDP/`. Get it running
> locally with the [Quickstart](#quickstart) below.
>
> _Note: the storage + data layers have since moved on from the original `SDP/` spec —
> the database is now **SQLite** (not Postgres) and character content comes from
> **MOEDICT 國語 + CC-CEDICT + Azure TTS** (not HSK meanings). The `SDP/` files are kept
> as the original build plan._

---

## What it does

- **Graded character database** — an open HSK word list selects + grades the characters (default **HSK 1–3**, ~540 single characters); each is then enriched from **MOEDICT 國語** (authoritative zhuyin + Traditional-Chinese definition), **CC-CEDICT** (English gloss), and **Azure zh-TW TTS** (pronunciation audio).
- **Both scripts, both notations, both definitions** — every entry shows simplified + traditional, pinyin + zhuyin, and English gloss + Chinese 釋義, with instant client-side toggles.
- **Native pronunciation audio** — a 🔊 button plays the zh-TW Azure TTS clip, stored in the database.
- **Character detail pages** — large character, pinyin, zhuyin, English gloss, Chinese definition, audio, and admin-entered example sentences.
- **Flashcard study mode** — pick a deck (by HSK level or all), flip, shuffle, mark known/again. Reviews are logged (spaced-repetition scheduling is a later phase).
- **Two logins, two roles** — an **admin** (manage characters + sentences) and a non-admin **test user** (study only). The test user is blocked from all admin routes.
- **Admin editing** — create/edit/delete characters and their example sentences from the admin panel.
- **Two themes, rounded UI** — a happy **Sunny** (light) theme and a **Dark** theme, toggleable and remembered.

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node 24 LTS · TypeScript (strict) · ESM · pnpm |
| Web framework | **Fastify** — one process serves SSR HTML + JSON API + built static assets |
| Templating | **Eta** via `@fastify/view` (mostly-static server-rendered HTML) |
| Interactivity | **Alpine.js** (theme toggle, script/notation toggles, flashcards, admin forms) |
| Assets / styling | **Vite + Sass** (bundling, HMR, the two themes) |
| Database | **SQLite** + **Drizzle ORM** (`better-sqlite3` driver) — a single file, audio stored inline as BLOBs |
| Auth | `@fastify/secure-session` (sealed cookie) + `crypto.scrypt` hashing; roles `admin` / `user` |
| Deploy | Render (Docker + persistent disk for the DB file); portable Dockerfile + `render.yaml` |

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

Requires **Node ≥ 24** and **pnpm**. No database server needed — the data lives in a
single SQLite file under `data/` (gitignored).

```bash
cp .env.example .env   # then edit: set SESSION_SECRET + admin/test creds
pnpm install
pnpm db:migrate        # create data/sweet-potato.db + apply schema
pnpm data:download     # fetch HSK list + CC-CEDICT + MOEDICT into scripts/data/ (gitignored)
pnpm seed              # build characters from MOEDICT/CC-CEDICT (+ audio if Azure is set)
pnpm dev               # Fastify + Vite (HMR) → http://localhost:3000
```

Generate a session secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Then log in at `/login` with the admin or test-user credentials from your `.env`.

### Pronunciation audio (optional)

`pnpm seed` renders zh-TW pronunciation audio via **Azure Speech** only when
`AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` are set — otherwise it seeds everything
else and skips audio. To enable it:

1. In the [Azure portal](https://portal.azure.com), create a **Speech service**
   resource (the free **F0** tier covers this dataset).
2. Copy its **Key** and **Region** (e.g. `eastus`) into `.env` as `AZURE_SPEECH_KEY`
   and `AZURE_SPEECH_REGION`.
3. Re-run `pnpm seed`. Audio is rendered once and cached under `scripts/data/audio/`,
   so subsequent seeds don't re-bill. (Optionally override `AZURE_TTS_VOICE`, default
   `zh-TW-HsiaoChenNeural`.)

### Useful scripts

| Script | What it does |
|--------|--------------|
| `pnpm dev` | Vite (HMR) + Fastify (tsx watch) |
| `pnpm build` | Build client assets + compile server to `dist/` |
| `pnpm start` | Run the compiled server (`NODE_ENV=production`) |
| `pnpm typecheck` / `pnpm lint` | Strict TS + ESLint gates |
| `pnpm test:zhuyin` | Verify the pinyin→zhuyin converter |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` | Drizzle migrations + studio (SQLite) |
| `pnpm data:download [--force]` · `pnpm seed` | Fetch source data (HSK + CC-CEDICT + MOEDICT) · seed DB |

## Using the app

Everything except the landing page requires a login. Sign in at `/login` with the
**admin** or **test-user** credentials from your `.env`.

| Route | Who | What |
|-------|-----|------|
| `/` | anyone | Landing page + theme toggle |
| `/login` | anyone | Sign in (admin or test user) |
| `/characters` | logged in | Browse / search the character grid |
| `/characters/:id` | logged in | Character detail + example sentences |
| `/study` | logged in | Flashcard study |
| `/admin` | admin only | Dashboard + character / sentence management |

**Display toggles** (top-right on every signed-in page) switch
**繁 Traditional ⇄ 簡 Simplified**, **Pinyin / Zhuyin / Both**, and definition language
**EN / 中 / Both**. Changes apply instantly with no reload and are remembered across
pages and visits. The **theme** toggle (Sunny / Dark) in the nav is likewise remembered.

**Browse** (`/characters`) — search by character, pinyin (with tone marks), or
English / Chinese definition; filter by HSK level; paginate (filters are preserved
across pages). Click any card to open its detail page.

**Study** (`/study`) — choose an HSK level (or all) and a deck size, then **New deck**.
Flip a card to reveal pinyin / zhuyin, the English gloss + Chinese 釋義, and a 🔊 audio
button, then mark how you did; every rating is logged to the reviews history. Click the
card to flip, or use the keyboard:

| Key | Action |
|-----|--------|
| `Space` / `Enter` | Flip card |
| `2` | Mark **Known** |
| `1` | Mark **Again** |
| `→` / `←` | Next / previous card |

On-screen **Again / Known / Prev / Shuffle / Skip** buttons do the same.

**Admin** (`/admin`, admin login only) — the dashboard shows totals and a per-HSK
breakdown. **Manage characters** lists and searches every entry; from there you can
**create** a character (with a one-click *derive zhuyin from pinyin* helper), **edit**
it, and add / edit / delete its **example sentences**. Deleting a character also
removes its sentences. Duplicate traditional forms are rejected with a friendly error.
The non-admin test user is blocked from every `/admin` route (403).

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_PATH` | path to the SQLite file (default `./data/sweet-potato.db`; the dir is created on start) |
| `SESSION_SECRET` | key for sealed-cookie sessions (≥32 chars) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `HSK_LEVELS` | seed range (default `1-3`) |
| `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` | _(seed-time, optional)_ Azure Speech creds for TTS audio |
| `AZURE_TTS_VOICE` / `AZURE_TTS_FORMAT` | _(optional)_ override the voice / audio format |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` / `production` |

## Deploy

The app runs as **one process** that serves SSR HTML, the JSON API, and built
static assets. A multi-stage `Dockerfile` builds the client + server (including
the `better-sqlite3` native addon); on start it runs migrations then launches the
server. The SQLite file (with its audio BLOBs) lives on a **persistent disk**, so
the service runs as a **single instance** — fine for this app.

**Render (blueprint):** push this repo, create a new Blueprint from `render.yaml`,
and set the secret env vars (`SESSION_SECRET`, `ADMIN_*`, `TEST_USER_*`) in the
dashboard. `render.yaml` mounts a disk at `/data` and points `DATABASE_PATH` at it;
migrations run on every deploy.

**Docker (anywhere):** mount a volume for the database directory and point
`DATABASE_PATH` into it so data survives container restarts.

```bash
docker build -t sweet-potato .
docker run --rm -p 3000:3000 \
  -v sweet_potato_data:/data -e DATABASE_PATH=/data/sweet-potato.db \
  -e SESSION_SECRET=… \
  -e ADMIN_EMAIL=… -e ADMIN_PASSWORD=… \
  -e TEST_USER_EMAIL=… -e TEST_USER_PASSWORD=… \
  sweet-potato
```

**Seeding in prod is a one-off** (migrations run automatically, seeding does not):
run `pnpm data:download && pnpm seed` once via the platform's shell/job (set the
`AZURE_SPEECH_*` vars there if you want audio). Production hardening is on by default
in `NODE_ENV=production`: secure cookies and `trustProxy`.

## Project structure

```
src/
  server/   Fastify app: index.ts, env.ts, plugins/, routes/, db/ (schema + migrations + migrate.ts), lib/, views/ (Eta)
  client/   Alpine entry (main.ts), components/ (theme, toggles, flashcard, admin-forms), styles/ (SCSS tokens + themes)
scripts/    download-data.ts, seed.ts (HSK select → MOEDICT/CC-CEDICT/Azure → characters; seed users), lib/ (hsk, moedict, cedict, tts), test-zhuyin.ts
public/     Vite build output (served by Fastify at /assets)
SDP/        the build plan
```

## Roadmap / out of scope (next phases)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · example sentences from the new sources.

---

_Data sources: the character set + HSK grading come from an open
[HSK 3.0 word list](https://github.com/drkameleon/complete-hsk-vocabulary); zhuyin and the
Traditional-Chinese definitions come from
[MOEDICT 國語 / 萌典](https://www.moedict.tw/) (g0v, 教育部國語辭典, CC BY-ND 3.0 TW);
English glosses come from [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
(CC BY-SA 4.0); pronunciation audio is rendered with [Azure zh-TW TTS](https://azure.microsoft.com/products/ai-services/text-to-speech)._
