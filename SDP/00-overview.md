# Sweet Potato (地瓜) — Master Feature Plan

A web app for studying Chinese characters: browse a graded character database,
see simplified + traditional forms with pinyin + zhuyin, **hear them pronounced**,
study with flashcards, and (as admin) edit entries and example sentences.

> **Status:** Greenfield rebuild. Build the app from scratch by working through this
> plan. The build is split into a sequential **foundation** and then **four parallel
> lanes** that independent agents can build at the same time — see
> [`01-build-order-and-parallelization.md`](01-build-order-and-parallelization.md),
> which is the map you follow when building.

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Database | **SQLite** (single file, `better-sqlite3` driver via Drizzle). No DB server, no Docker Postgres. (Plan moved Postgres → SQLite 2026-06-27.) |
| Audio | **In scope.** Pronunciation via the browser's free **Web Speech API** (`speechSynthesis`, native OS voices) — no subscription, no paid TTS. Architected behind a `Speaker` interface so a cloud TTS can swap in later. |
| Audio surface | 🔊 button on **character detail** (the character + each example sentence), **flashcards** (front character + optional auto-play on flip), and **every browse card**. |
| Deploy target | **Portable Docker + persistent volume** for the `.db` file. Host-agnostic (Fly / Render / Railway chosen later). No managed-DB add-on. |
| Testing | **Vitest.** Each lane ships with unit / light-integration tests so parallel work self-verifies before merge. |
| Example sentences | **Admin-entered only.** Schema + admin CRUD; nothing seeded. |
| Character seed | **HSK-graded subset, default HSK 1–3** (~600–900 chars). Level range is configurable. |
| First-build scope | The 8 requested features **+ flashcard study mode + audio**. No SRS scheduling yet. |

## Requested features → where they're built

| # | Feature | Step(s) |
|---|---------|---------|
| 1 | Admin login | F7 (auth + roles), C1–C3 (admin UI) |
| 2 | Database | F4 (SQLite setup), F5 (schema) |
| 3 | Test user login (non-admin) | F7 (seeded `user` role; blocked from `/admin`) |
| 4 | Downloadable character database | D1–D2 (HSK + CC-CEDICT seed script) |
| 5 | Simplified + traditional display | F5 (columns), A1/A2 (script toggle) |
| 6 | Pinyin + zhuyin for every character | F8 (zhuyin derivation), A1/A2 (notation toggle) |
| 7 | Admin can edit entries | C2 (character editor) |
| 8 | Entry shows char + pinyin + zhuyin + 1–2 example sentences | A2 (detail page), C3 (sentence CRUD) |
| + | Flashcard study mode | B1–B3 |
| + | **Audio pronunciation (Web Speech API)** | F9 (audio store + `Speaker`), wired into A1/A2/B2 |

## Stack

- **Node 24 LTS · TypeScript (strict) · ESM · pnpm**
- **Fastify** — web framework. One process serves SSR HTML + JSON API + built static assets (simplest to deploy). Routes auto-registered via `@fastify/autoload`.
- **Eta** templating via `@fastify/view` → server-rendered, mostly-static HTML.
- **Alpine.js** — client interactivity only (theme toggle, script/notation toggles, **audio**, flashcards, admin forms).
- **Vite + Sass** — asset bundling, HMR in dev, the two themes.
- **Drizzle ORM + SQLite** (`better-sqlite3` driver — synchronous, zero-network, single file).
- **Web Speech API** (`window.speechSynthesis`) — native browser voices for pronunciation; **no server, no subscription**.
- **`@fastify/secure-session`** — sealed-cookie sessions, no session table.
- **`crypto.scrypt`** (Node built-in) — password hashing, zero native deps.
- **Zod** — request body validation in admin/API routes.
- **Vitest** — unit + integration tests.

> **Why SQLite?** This app is read-heavy, single-process, and modest in size. A single
> `better-sqlite3` file removes the Postgres server, the Docker dependency, the connection
> pool, and SSL config — local dev is just `pnpm dev`. The one tradeoff is deployment: the
> `.db` file needs a **persistent volume** (handled in G3). WAL mode + `foreign_keys = ON`
> are set at connection time.

## Data model (Drizzle / SQLite)

SQLite types: `serial → integer pk autoincrement`, `timestamptz → integer({ mode: 'timestamp' })`,
text stays text. `foreign_keys = ON` (set per-connection in F4) makes the cascades below fire.

```
users
  id            integer pk autoincrement
  email         text unique not null
  password_hash text not null            -- scrypt: "<saltHex>:<hashHex>"
  role          text not null            -- 'admin' | 'user'  ($type union)
  display_name  text
  created_at    integer timestamp default (unixepoch())

characters
  id             integer pk autoincrement
  traditional    text not null unique
  simplified     text not null
  pinyin         text not null           -- tone-marked, e.g. "nǐ"
  pinyin_search  text not null           -- tone-stripped, lowercased, spaceless: "ni"  (fixes tone-sensitive search)
  zhuyin         text not null           -- e.g. "ㄋㄧˇ"
  definition     text not null
  hsk_level      integer                 -- nullable
  frequency_rank integer                 -- nullable
  created_at     integer timestamp default (unixepoch())
  updated_at     integer timestamp default (unixepoch())   -- app sets on update

example_sentences
  id           integer pk autoincrement
  character_id integer not null references characters(id) on delete cascade
  traditional  text not null
  simplified   text not null
  pinyin       text
  zhuyin       text
  translation  text not null
  notes        text
  sort_order   integer default 0
  created_at   integer timestamp default (unixepoch())
  updated_at   integer timestamp default (unixepoch())

reviews                                  -- append-only; SRS-ready, no scheduler yet
  id           integer pk autoincrement
  user_id      integer not null references users(id) on delete cascade
  character_id integer not null references characters(id) on delete cascade
  rating       text not null             -- 'known' | 'again'  ($type union)
  reviewed_at  integer timestamp default (unixepoch())
```

> **`pinyin_search`** is new vs. the old plan: it stores a tone-stripped, lowercased,
> space-free copy of the pinyin so searching `nihao` / `hao` matches `nǐ hǎo`. This fixes
> the tone-sensitive-search defect noted in the previous build. Populated by the seed (D2)
> and the admin editor (C2) via `stripTones()` in `lib/pinyin.ts` (F8).

## Routes

**Public**
- `GET /` — landing/home
- `GET /login` · `POST /login` · `POST /logout`
- `GET /healthz` — health check (used by the container)

**Authenticated (`user` or `admin`)**
- `GET /characters` — browse: search, HSK filter, pagination, script + notation toggles, 🔊
- `GET /characters/:id` — detail: character, pinyin, zhuyin, definition, example sentences, 🔊
- `GET /study` — flashcards (with 🔊 / auto-play)
- `POST /api/reviews` — log a flashcard review (JSON)

**Admin only (`admin`)**
- `GET /admin` — dashboard (counts)
- `GET /admin/characters` — list with edit/delete
- `GET /admin/characters/new` · `POST /admin/characters`
- `GET /admin/characters/:id/edit` · `POST /admin/characters/:id` · `POST /admin/characters/:id/delete`
- `POST /admin/characters/:id/sentences` · `POST /admin/sentences/:id` · `POST /admin/sentences/:id/delete`
- `POST /admin/derive-zhuyin` — helper used by the editor

> **Audio adds no routes.** It is 100% client-side (`speechSynthesis`). The `Speaker`
> interface (F9) is the seam where a future server/cloud TTS could add a `POST /api/tts`.

## Audio — native browser voices (Web Speech API)

- A client `audio` Alpine store wraps `window.speechSynthesis`, picks the best Chinese voice
  (prefer `zh-TW` → `zh-HK`/`zh` → `zh-CN` → `zh-SG`), and handles Chrome's async voice
  loading (`voiceschanged`).
- A reusable `🔊` button partial; the button is **hidden/disabled with a tooltip** when no
  Chinese voice is installed or `speechSynthesis` is unsupported.
- An **auto-play-on-flip** preference (persisted to `localStorage`) for study mode.
- Defined behind a `Speaker` interface so a paid cloud TTS (Azure / Google / ElevenLabs) can
  replace the Web Speech implementation without touching any call site.
- **Known limitations** (documented in G4): voice availability + quality vary by OS/browser;
  iOS Safari only speaks after a user gesture and may truncate long utterances.

## Theming — two themes, rounded UI

Switched by `data-theme` on `<html>`. Alpine toggle persists choice to `localStorage`;
on first visit, falls back to `prefers-color-scheme`.

- **Sunny (light/happy):** sweet-potato orange primary, cream paper bg, leaf-green accent, soft shadows.
- **Dark:** charcoal/aubergine bg, warm orange retained as accent, muted text.
- Shared design tokens (color / spacing / radius). Generous border-radius everywhere.
- **AA contrast required in both themes** (the prior build's sunny theme failed AA — use the
  AA-safe token values: primary `#b05828`, accent `#4f7a3d`, danger `#b8402f`, text-muted `#6f6052`).

## Project structure

```
package.json  tsconfig.json  .eslintrc.cjs  .prettierrc  .gitignore  .env.example
Dockerfile  .dockerignore  drizzle.config.ts  vite.config.ts  vitest.config.ts
data/                        # SQLite db file lives here (gitignored; volume-mounted in prod)
src/
  server/
    index.ts                 # Fastify bootstrap (autoloads routes/)
    env.ts                   # validated env loader
    plugins/                 # view, static, session, auth-guards
    routes/                  # auto-loaded: public, characters, study, api, admin
    db/                      # client.ts, migrate.ts, schema.ts, migrations/
    lib/                     # assets.ts, password.ts, pinyin.ts, zhuyin.ts
    views/                   # Eta: layouts/, pages/, partials/
  client/
    main.ts                  # Alpine init + component registration
    components/              # theme.ts, toggles.ts, audio.ts, flashcard.ts, admin-forms.ts
    styles/                  # tokens/themes/components/main.scss + lanes/_browse,_study,_admin.scss
scripts/
  download-data.ts  sources.ts  seed.ts  seed-dev.ts   # data + seeding
tests/                       # Vitest specs (one file per lane)
SDP/                         # this plan
```

## Build order (summary — full detail in `01-build-order-and-parallelization.md`)

```
Phase 0 — FOUNDATION (sequential, one builder):
  F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9

Phase 1 — LANES (parallel; each depends ONLY on the foundation):
  ┌─ Lane A: A1 → A2        (browse + detail)
  ├─ Lane B: B1 → B2 → B3   (study + flashcards + reviews API)
  ├─ Lane C: C1 → C2 → C3   (admin dashboard + editor + sentences)
  └─ Lane D: D1 → D2        (data download + seed)

Phase 2 — INTEGRATION (sequential, one builder):
  G1 (merge) → G2 (seed real data) → G3 (deploy) → G4 (QA + audio pass)
```

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | SQLite file URL, default `file:./data/sweet-potato.db` |
| `SESSION_SECRET` | key for `@fastify/secure-session` (≥32 bytes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `PORT` | HTTP port (default 3000) |
| `NODE_ENV` | `development` / `production` |
| `HSK_LEVELS` | seed range, default `1-3` |

> Removed vs. the Postgres plan: connection host/user/password and `DATABASE_SSL` — SQLite
> needs none of them.

## Glossary

- **Pinyin** — romanization with tone marks (`nǐ hǎo`).
- **Zhuyin / Bopomofo** — phonetic symbols (`ㄋㄧˇ ㄏㄠˇ`), derived from pinyin in `lib/zhuyin.ts`.
- **Web Speech API** — browser-native speech synthesis (`window.speechSynthesis`); the free,
  no-subscription source of pronunciation audio for the first pass.
- **CC-CEDICT** — open Chinese-English dictionary; fallback source for definitions.
- **HSK** — standardized Chinese proficiency levels; defines the graded seed subset.

## Out of scope (next phase)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · **cloud/paid TTS** (the `Speaker` seam is ready for it, but the first pass is
Web Speech only).
