# Sweet Potato (蕃薯) — Master Feature Plan

A web app for studying Chinese characters: browse a graded character database,
see simplified + traditional forms with pinyin + zhuyin, study with flashcards,
and (as admin) edit entries and example sentences.

> **Status:** Greenfield. The project directory was empty when planning started.
> These `SDP/*.md` files are the build spec. Build the app by working through the
> numbered steps in order.

---

## Locked decisions

| Topic | Decision |
|-------|----------|
| Deploy target | Railway / Render (managed Postgres add-on). Dockerfile + `render.yaml` included; portable. |
| Example sentences | **Admin-entered only.** Schema + admin CRUD; nothing seeded. |
| Character seed | **HSK-graded subset, default HSK 1–3** (~600–900 chars). Level range is configurable. |
| First-build scope | The 8 requested features **+ a basic flashcard study mode** (flip / shuffle / mark-known). No SRS scheduling yet. |

## Requested features → where they're built

| # | Feature | Step(s) |
|---|---------|---------|
| 1 | Admin login | 07 (auth + roles), 12–14 (admin UI) |
| 2 | Postgres database | 04 (setup), 05 (schema) |
| 3 | Test user login (non-admin) | 07 (seeded `user` role; blocked from `/admin`) |
| 4 | Downloadable character database | 08 (HSK + CC-CEDICT seed script) |
| 5 | Simplified + traditional display | 05 (columns), 09/10 (script toggle) |
| 6 | Pinyin + zhuyin for every character | 08 (zhuyin derivation), 09/10 (notation toggle) |
| 7 | Admin can edit entries | 13 (character editor) |
| 8 | Entry shows char + pinyin + zhuyin + 1–2 example sentences | 10 (detail page), 14 (sentence CRUD) |
| + | Flashcard study mode | 11 |

## Stack

- **Node 24 LTS · TypeScript (strict) · ESM · pnpm**
- **Fastify** — web framework. One process serves SSR HTML + JSON API + built static assets (simplest to deploy).
- **Eta** templating via `@fastify/view` → server-rendered, mostly-static HTML.
- **Alpine.js** — client interactivity only (theme toggle, script/notation toggles, flashcards, admin forms).
- **Vite + Sass** — asset bundling, HMR in dev, the two themes.
- **Drizzle ORM + PostgreSQL** (`pg` driver).
- **`@fastify/secure-session`** — sealed-cookie sessions, no session table.
- **`crypto.scrypt`** (Node built-in) — password hashing, zero native deps.
- **Zod** — request body validation in admin/API routes.

> **Why Fastify over Express/Nest?** Fast, first-class TypeScript, official `view`/`static`/`secure-session`
> plugins cover everything here, and it keeps the whole app in one deployable process. Nest is too heavy for
> this; Express needs more glue. This is the "framework suggestion" the brief asked for.

## Data model (Drizzle / Postgres)

```
users
  id            serial pk
  email         text unique not null
  password_hash text not null            -- scrypt: "<saltHex>:<hashHex>"
  role          text not null            -- 'admin' | 'user'
  display_name  text
  created_at    timestamptz default now()

characters
  id             serial pk
  traditional    text not null unique
  simplified     text not null
  pinyin         text not null           -- tone-marked, e.g. "nǐ"
  zhuyin         text not null           -- e.g. "ㄋㄧˇ"
  definition     text not null
  hsk_level      int                     -- nullable
  frequency_rank int                     -- nullable
  created_at     timestamptz default now()
  updated_at     timestamptz default now()

example_sentences
  id           serial pk
  character_id int not null references characters(id) on delete cascade
  traditional  text not null
  simplified   text not null
  pinyin       text
  zhuyin       text
  translation  text not null
  notes        text
  sort_order   int default 0
  created_at   timestamptz default now()
  updated_at   timestamptz default now()

reviews                                  -- append-only; SRS-ready, no scheduler yet
  id           serial pk
  user_id      int not null references users(id) on delete cascade
  character_id int not null references characters(id) on delete cascade
  rating       text not null             -- 'known' | 'again'
  reviewed_at  timestamptz default now()
```

## Routes

**Public**
- `GET /` — landing/home
- `GET /login` · `POST /login` · `POST /logout`

**Authenticated (`user` or `admin`)**
- `GET /characters` — browse: search, HSK filter, pagination, script + notation toggles
- `GET /characters/:id` — detail: character, pinyin, zhuyin, definition, example sentences
- `GET /study` — flashcards
- `POST /api/reviews` — log a flashcard review (JSON)

**Admin only (`admin`)**
- `GET /admin` — dashboard (counts)
- `GET /admin/characters` — list with edit/delete
- `GET /admin/characters/new` · `POST /admin/characters`
- `GET /admin/characters/:id/edit` · `POST /admin/characters/:id` · `POST /admin/characters/:id/delete`
- `POST /admin/characters/:id/sentences` · `POST /admin/sentences/:id` · `POST /admin/sentences/:id/delete`

## Theming — two themes, rounded UI

Switched by `data-theme` on `<html>`. Alpine toggle persists choice to `localStorage`;
on first visit, falls back to `prefers-color-scheme`.

- **Sunny (light/happy):** sweet-potato orange primary `~#E07A3F`, cream paper bg `~#FFF8F0`, leaf-green accent `~#7FB069`, soft shadows.
- **Dark:** charcoal/aubergine bg `~#1E1A24`, warm orange retained as accent, muted text.
- Shared design tokens (color / spacing / radius). Generous border-radius everywhere (buttons, cards, inputs, badges).

## Project structure

```
package.json  tsconfig.json  .eslintrc.cjs  .prettierrc  .gitignore  .env.example
docker-compose.yml  Dockerfile  render.yaml  drizzle.config.ts  vite.config.ts
src/
  server/
    index.ts                 # Fastify bootstrap
    env.ts                   # validated env loader
    plugins/                 # view, static, session, auth-guards
    routes/                  # public, characters, study, admin, api
    db/                      # client.ts, schema.ts, migrations/
    lib/                     # zhuyin.ts, pinyin.ts, password.ts
    views/                   # Eta: layouts/, pages/, partials/
  client/
    main.ts                  # Alpine init + component registration
    components/              # theme.ts, flashcard.ts, toggles.ts, admin-forms.ts
    styles/                  # tokens.scss, themes.scss, components.scss, main.scss
scripts/
  download-data.ts           # fetch HSK + CC-CEDICT source files
  seed.ts                    # parse, derive zhuyin, upsert chars + seed users
public/                      # vite build output (served by @fastify/static)
SDP/                         # this plan
```

## Build order & dependencies

```
01 → 02 → 03 → 04 → 05        (sequential foundation)
05 → 06   (theming/layout)
05 → 07   (auth)
05 → 08   (seed)
06 + 07 (+08 data) → 09, 10, 11, 12, 13, 14
→ 15 (deploy) → 16 (QA)
```

## Environment variables

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | key for `@fastify/secure-session` (≥32 bytes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seeded admin login |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | seeded non-admin login |
| `PORT` | HTTP port (default 3000) |
| `NODE_ENV` | `development` / `production` |
| `HSK_LEVELS` | seed range, default `1-3` |

## Glossary

- **Pinyin** — romanization with tone marks (`nǐ hǎo`).
- **Zhuyin / Bopomofo** — phonetic symbols (`ㄋㄧˇ ㄏㄠˇ`), derived from pinyin in `lib/zhuyin.ts`.
- **CC-CEDICT** — open Chinese-English dictionary; source for traditional forms + definitions.
- **HSK** — standardized Chinese proficiency levels; defines the graded seed subset.

## Out of scope (next phase)

Public self-signup · spaced-repetition (FSRS) scheduling · stroke-order rendering ·
decks/groups · audio pronunciation.
