# F7 — Auth + roles + session  ◄ AUTH CONTRACT

**Phase:** 0 — Foundation (sequential). **Depends on:** F5 (users table), F6 (layout for login).

**Goal:** Session-based login with two roles, the `requireUser` / `requireAdmin` guards lanes
depend on, login/logout, seeded users, and a **dev fixture** so UI lanes have data immediately.

## Tasks

- [ ] Deps: `@fastify/secure-session`, `@fastify/cookie`.
- [ ] `src/server/lib/password.ts`: `hash(password)` / `verify(password, stored)` using Node `crypto.scrypt` + random salt; stored format `"<saltHex>:<hashHex>"`; constant-time compare (`crypto.timingSafeEqual`).
- [ ] `src/server/plugins/session.ts`: register `@fastify/secure-session` with key from `SESSION_SECRET`; cookie `httpOnly`, `sameSite: 'lax'`, `secure` in prod, sensible `maxAge`.
- [ ] `src/server/plugins/auth.ts`:
  - `preHandler` (app-wide) loads the session user id → fetches user → sets `request.user` (`User | null`); expose `currentUser` to all templates via the render helper.
  - **Decorate the app** with `requireUser` (redirect to `/login` if anonymous) and `requireAdmin` (403 if `role !== 'admin'`). **These decorators are the contract lanes call** inside their route plugins.
- [ ] `src/server/routes/auth.ts` (autoloaded):
  - `GET /login` → login page (Alpine client validation, friendly errors).
  - `POST /login` → Zod-validate, `verify`, set session, redirect `/characters`; on failure re-render generic "invalid email or password".
  - `POST /logout` → clear session, redirect `/`.
- [ ] `views/pages/login.eta`.
- [ ] **Shared seed helper** `scripts/seed-users.ts`: `export async function seedUsers(db)` — upsert admin (`ADMIN_EMAIL/PASSWORD`) + test user (`TEST_USER_EMAIL/PASSWORD`), idempotent, never log passwords. **Imported by both `seed-dev.ts` (below) and Lane D's `seed.ts`.**
- [ ] **Dev fixture** `scripts/seed-dev.ts` + npm `seed:dev`: call `seedUsers(db)`, then upsert ~6 hand-picked characters (with pre-derived zhuyin + `pinyinSearch`) and 2 example sentences. No downloads, no phonetics dependency — this unblocks Lanes A/B/C before Lane D exists.

## Files created

- `src/server/lib/password.ts`, `plugins/{session,auth}.ts`, `routes/auth.ts`, `views/pages/login.eta`
- `scripts/seed-users.ts`, `scripts/seed-dev.ts`

## Acceptance criteria

- Admin + test user log in; bad creds → generic error. Session persists; logout clears it.
- `requireUser` redirects anonymous users to `/login`; `requireAdmin` blocks the test user (403).
- Passwords are scrypt-hashed (never plaintext).
- `pnpm seed:dev` produces a usable DB (2 users + ~6 chars + 2 sentences).

## How to verify

```bash
pnpm db:migrate && pnpm seed:dev && pnpm dev
# Log in as test user → /characters works (data present), /admin → 403. Admin → /admin works. Logout clears session.
sqlite3 data/sweet-potato.db 'select email, role, substr(password_hash,1,12) from users;'
```
