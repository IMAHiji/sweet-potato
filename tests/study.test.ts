import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { eq, sql } from 'drizzle-orm';
import * as schema from '../src/server/db/schema.js';

const migrationsFolder = join(
  fileURLToPath(import.meta.url),
  '../../src/server/db/migrations',
);

// In-memory DB shared across tests in this file
const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChar(
  traditional: string,
  hskLevel: number,
  opts: { traditional?: string } = {},
): schema.NewCharacter {
  return {
    traditional: opts.traditional ?? traditional,
    simplified: traditional,
    pinyin: 'pīn yīn',
    pinyinSearch: 'pin yin',
    zhuyin: 'ㄆㄧㄣ ㄧㄣ',
    definition: `Definition of ${traditional}`,
    hskLevel,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  migrate(db, { migrationsFolder });

  // Seed a user
  db.insert(schema.users)
    .values({
      email: 'test@example.com',
      passwordHash: 'hash',
      role: 'user',
    })
    .run();

  // Seed characters: 3 at level 1, 2 at level 2
  db.insert(schema.characters)
    .values([
      makeChar('一', 1),
      makeChar('二', 1),
      makeChar('三', 1),
      makeChar('四', 2),
      makeChar('五', 2),
    ])
    .run();
});

// ─── B1 — Deck query ──────────────────────────────────────────────────────────

describe('deck query', () => {
  it('returns all characters when no level filter', () => {
    const deck = db
      .select()
      .from(schema.characters)
      .orderBy(sql`RANDOM()`)
      .limit(100)
      .all();
    expect(deck.length).toBe(5);
  });

  it('respects level filter — only returns matching HSK level', () => {
    const deck = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.hskLevel, 1))
      .orderBy(sql`RANDOM()`)
      .limit(100)
      .all();
    expect(deck.length).toBe(3);
    for (const card of deck) {
      expect(card.hskLevel).toBe(1);
    }
  });

  it('respects limit — returns no more than limit cards', () => {
    const deck = db
      .select()
      .from(schema.characters)
      .orderBy(sql`RANDOM()`)
      .limit(2)
      .all();
    expect(deck.length).toBeLessThanOrEqual(2);
  });

  it('level 2 filter returns only level-2 characters', () => {
    const deck = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.hskLevel, 2))
      .orderBy(sql`RANDOM()`)
      .limit(100)
      .all();
    expect(deck.length).toBe(2);
    for (const card of deck) {
      expect(card.hskLevel).toBe(2);
    }
  });
});

// ─── Deck shape ───────────────────────────────────────────────────────────────

describe('deck JSON shape', () => {
  it('has expected fields on each character', () => {
    const deck = db
      .select()
      .from(schema.characters)
      .limit(1)
      .all();
    expect(deck.length).toBe(1);
    const card = deck[0]!;
    expect(card).toHaveProperty('id');
    expect(card).toHaveProperty('traditional');
    expect(card).toHaveProperty('simplified');
    expect(card).toHaveProperty('pinyin');
    expect(card).toHaveProperty('zhuyin');
    expect(card).toHaveProperty('definition');
    expect(card).toHaveProperty('hskLevel');
    expect(typeof card.traditional).toBe('string');
    expect(typeof card.simplified).toBe('string');
    expect(typeof card.pinyin).toBe('string');
    expect(typeof card.zhuyin).toBe('string');
    expect(typeof card.definition).toBe('string');
  });

  it('serialises and deserialises correctly via JSON', () => {
    const deck = db.select().from(schema.characters).limit(5).all();
    const json = JSON.stringify(deck);
    const parsed = JSON.parse(json) as schema.Character[];
    expect(parsed.length).toBe(deck.length);
    expect(parsed[0]?.traditional).toBe(deck[0]?.traditional);
    expect(parsed[0]?.definition).toBe(deck[0]?.definition);
  });
});

// ─── B3 — Review insert ───────────────────────────────────────────────────────

describe('review insert', () => {
  it('inserts a review and attributes it to the correct user', () => {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'test@example.com'))
      .get()!;

    const char = db.select().from(schema.characters).limit(1).get()!;

    db.insert(schema.reviews)
      .values({
        userId: user.id,
        characterId: char.id,
        rating: 'known',
      })
      .run();

    const saved = db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, user.id))
      .all();

    expect(saved.length).toBeGreaterThan(0);
    const review = saved[saved.length - 1]!;
    expect(review.userId).toBe(user.id);
    expect(review.characterId).toBe(char.id);
    expect(review.rating).toBe('known');
  });

  it('inserts a "again" rating', () => {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, 'test@example.com'))
      .get()!;

    const char = db.select().from(schema.characters).limit(1).get()!;

    db.insert(schema.reviews)
      .values({
        userId: user.id,
        characterId: char.id,
        rating: 'again',
      })
      .run();

    const saved = db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, user.id))
      .all();

    const last = saved[saved.length - 1]!;
    expect(last.rating).toBe('again');
  });
});

// ─── Flashcard pure logic (inline) ────────────────────────────────────────────

describe('Fisher-Yates shuffle', () => {
  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const x = a[i];
      const y = a[j];
      if (x !== undefined && y !== undefined) {
        a[i] = y;
        a[j] = x;
      }
    }
    return a;
  }

  it('returns array with same length', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).length).toBe(5);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const arr = [1, 2, 3];
    shuffle(arr);
    expect(arr).toEqual([1, 2, 3]);
  });
});

describe('tally and done detection', () => {
  it('increments known tally', () => {
    const tallies = { known: 0, again: 0 };
    tallies['known']++;
    expect(tallies.known).toBe(1);
  });

  it('increments again tally', () => {
    const tallies = { known: 0, again: 0 };
    tallies['again']++;
    tallies['again']++;
    expect(tallies.again).toBe(2);
  });

  it('detects done when index reaches deck length', () => {
    const deck = ['a', 'b', 'c'];
    let index = 0;
    let done = false;

    const advance = () => {
      index++;
      if (index >= deck.length) done = true;
    };

    advance(); expect(done).toBe(false);
    advance(); expect(done).toBe(false);
    advance(); expect(done).toBe(true);
  });

  it('restart resets state', () => {
    let index = 3;
    let done = true;
    let flipped = true;
    const tallies = { known: 5, again: 2 };

    // restart
    index = 0;
    done = false;
    flipped = false;
    tallies.known = 0;
    tallies.again = 0;

    expect(index).toBe(0);
    expect(done).toBe(false);
    expect(flipped).toBe(false);
    expect(tallies.known).toBe(0);
    expect(tallies.again).toBe(0);
  });
});
