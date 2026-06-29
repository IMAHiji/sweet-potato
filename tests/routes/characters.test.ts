import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createTestApp } from '../helpers/testApp.js';
import { db } from '../../src/server/db/client.js';
import { users, characters } from '../../src/server/db/schema.js';
import { hash } from '../../src/server/lib/password.js';

let app: FastifyInstance;
/** Session cookie for the pre-seeded test user. */
let sessionCookie: string;

beforeAll(async () => {
  app = await createTestApp();

  // Seed one user and log in so we have an authenticated session cookie.
  const passwordHash = await hash('testpassword123');
  db.insert(users)
    .values({ email: 'chars-user@test.com', passwordHash, role: 'user' })
    .run();

  const loginRes = await app.inject({
    method: 'POST',
    url: '/login',
    payload: 'email=chars-user@test.com&password=testpassword123',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  sessionCookie = loginRes.headers['set-cookie'] as string;
});

afterAll(async () => {
  db.delete(users).run();
  await app.close();
});

// Remove any characters seeded during individual tests.
afterEach(() => {
  db.delete(characters).run();
});

// ── GET /characters ───────────────────────────────────────────────────────────

describe('GET /characters', () => {
  it('redirects an unauthenticated request to /login', async () => {
    const res = await app.inject({ method: 'GET', url: '/characters' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/login');
  });

  it('returns 200 for an authenticated user with an empty DB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/characters',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 200 when querying with a search term', async () => {
    db.insert(characters)
      .values({
        traditional: '好',
        simplified: '好',
        pinyin: 'hǎo',
        pinyinSearch: 'hao',
        zhuyin: 'ㄏㄠˇ',
        definition: 'good; well',
        hskLevel: 1,
      })
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/characters?q=hao',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 200 when filtering by HSK level', async () => {
    db.insert(characters)
      .values({
        traditional: '你',
        simplified: '你',
        pinyin: 'nǐ',
        pinyinSearch: 'ni',
        zhuyin: 'ㄋㄧˇ',
        definition: 'you',
        hskLevel: 1,
      })
      .run();

    const res = await app.inject({
      method: 'GET',
      url: '/characters?level=1',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 200 when combining search and level filter', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/characters?q=ni&level=1',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /characters/:id ───────────────────────────────────────────────────────

describe('GET /characters/:id', () => {
  it('redirects an unauthenticated request to /login', async () => {
    const res = await app.inject({ method: 'GET', url: '/characters/1' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('/login');
  });

  it('returns 404 for a non-existent ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/characters/999999',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for a non-numeric ID', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/characters/notanumber',
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 200 for an existing character', async () => {
    const inserted = db
      .insert(characters)
      .values({
        traditional: '中',
        simplified: '中',
        pinyin: 'zhōng',
        pinyinSearch: 'zhong',
        zhuyin: 'ㄓㄨㄥ',
        definition: 'middle; center',
        hskLevel: 1,
      })
      .returning({ id: characters.id })
      .get()!;

    const res = await app.inject({
      method: 'GET',
      url: `/characters/${inserted.id}`,
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
  });
});
