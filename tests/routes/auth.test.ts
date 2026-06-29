import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { db } from '../../src/server/db/client.js';
import { users } from '../../src/server/db/schema.js';
import { hash } from '../../src/server/lib/password.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

// Clean all users after each test so emails don't collide between tests.
afterEach(() => {
  db.delete(users).run();
});

// ── GET /login ────────────────────────────────────────────────────────────────

describe('GET /login', () => {
  it('shows the login page (200) for an unauthenticated visitor', async () => {
    const res = await app.inject({ method: 'GET', url: '/login' });
    expect(res.statusCode).toBe(200);
  });

  it('redirects an already-authenticated user to /characters', async () => {
    const passwordHash = await hash('pass1234');
    db.insert(users)
      .values({ email: 'already@test.com', passwordHash, role: 'user' })
      .run();

    // Log in to obtain a session cookie.
    const loginRes = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=already@test.com&password=pass1234',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(loginRes.statusCode).toBe(302);
    const cookie = loginRes.headers['set-cookie'] as string;

    // GET /login while carrying the session cookie.
    const res = await app.inject({
      method: 'GET',
      url: '/login',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/characters');
  });
});

// ── POST /login ───────────────────────────────────────────────────────────────

describe('POST /login', () => {
  it('redirects to /characters on successful login', async () => {
    const passwordHash = await hash('goodpass1');
    db.insert(users)
      .values({ email: 'ok@test.com', passwordHash, role: 'user' })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=ok@test.com&password=goodpass1',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/characters');
  });

  it('sets a session cookie on successful login', async () => {
    const passwordHash = await hash('goodpass2');
    db.insert(users)
      .values({ email: 'cookie@test.com', passwordHash, role: 'user' })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=cookie@test.com&password=goodpass2',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 200 (re-renders form) for a wrong password', async () => {
    const passwordHash = await hash('rightpassword');
    db.insert(users)
      .values({ email: 'wrong@test.com', passwordHash, role: 'user' })
      .run();

    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=wrong@test.com&password=wrongpassword',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 200 (re-renders form) for a non-existent email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=nobody@test.com&password=doesntmatter',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 200 when the request body is missing required fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=notanemail',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── POST /logout ──────────────────────────────────────────────────────────────

describe('POST /logout', () => {
  it('redirects to / after logout', async () => {
    const res = await app.inject({ method: 'POST', url: '/logout' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/');
  });

  it('sets a session cookie in the response that clears the session', async () => {
    const passwordHash = await hash('pass9876');
    db.insert(users)
      .values({ email: 'logout@test.com', passwordHash, role: 'user' })
      .run();

    // Log in to get a valid session cookie.
    const loginRes = await app.inject({
      method: 'POST',
      url: '/login',
      payload: 'email=logout@test.com&password=pass9876',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    const cookie = loginRes.headers['set-cookie'] as string;

    // Verify the session grants access.
    const before = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { cookie },
    });
    expect(before.statusCode).toBe(200);

    // Log out — secure-session clears the session via a new Set-Cookie header.
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/logout',
      headers: { cookie },
    });
    const clearedCookie = logoutRes.headers['set-cookie'] as string;

    // A request carrying the cleared cookie must no longer be authenticated.
    const afterLogout = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { cookie: clearedCookie },
    });
    expect(afterLogout.statusCode).toBe(302);
    expect(afterLogout.headers['location']).toBe('/login');
  });
});
