# Step 07 — Auth + roles (admin + test user)

**Goal:** Session-based login with two roles, route guards, login/logout pages, and
seeded admin + non-admin users.

**Depends on:** 05 (users table), 06 (layout for login page).

## Tasks

- [ ] Add deps: `@fastify/secure-session`, `@fastify/cookie` (dependency of secure-session).
- [ ] `src/server/lib/password.ts`: `hash(password)` and `verify(password, stored)` using Node `crypto.scrypt` + random salt; stored format `"<saltHex>:<hashHex>"`; constant-time compare (`crypto.timingSafeEqual`).
- [ ] `src/server/plugins/session.ts`: register `@fastify/secure-session` with key from `SESSION_SECRET`; cookie `httpOnly`, `sameSite: 'lax'`, `secure` in prod, sensible `maxAge`.
- [ ] `src/server/plugins/auth.ts`:
  - `preHandler` that loads the session user id → fetches user → sets `request.user` (or null). Expose `currentUser` to all templates via the render helper.
  - Decorators/guards: `requireUser` (401/redirect to `/login` if not logged in) and `requireAdmin` (403 if `role !== 'admin'`).
- [ ] Routes (`src/server/routes/auth.ts`):
  - `GET /login` → login page (Alpine client-side validation, friendly errors).
  - `POST /login` → validate (Zod), `verify` password, set session, redirect to `/characters`; on failure re-render with error (generic "invalid email or password").
  - `POST /logout` → clear session, redirect to `/`.
- [ ] Nav partial: show Login when logged out; show user name, Study/Browse, Logout (and an Admin link if `role==='admin'`) when logged in.
- [ ] Seed users in `scripts/seed.ts` (shared with step 08): upsert admin from `ADMIN_EMAIL/PASSWORD` and test user from `TEST_USER_EMAIL/PASSWORD`. Idempotent; never log passwords.
- [ ] Basic brute-force friction: small fixed delay on failed login (optional, note only).

## Files created

- `src/server/lib/password.ts`
- `src/server/plugins/session.ts`, `src/server/plugins/auth.ts`
- `src/server/routes/auth.ts`
- `views/pages/login.eta`
- seed-users portion of `scripts/seed.ts`

## Acceptance criteria

- Admin and test user can log in; bad credentials show a generic error.
- `requireUser` redirects anonymous users to `/login`; `requireAdmin` blocks the test user (403) from `/admin`.
- Session persists across reloads; logout clears it.
- Passwords are scrypt-hashed in DB (never plaintext).

## How to verify

```bash
pnpm seed     # creates admin + test user
pnpm dev
# Log in as test user → /characters works, /admin → 403.
# Log in as admin → Admin link appears, /admin works.
# Wrong password → generic error. Logout → session gone.
psql $DATABASE_URL -c 'select email, role, left(password_hash,12) from users;'
```
