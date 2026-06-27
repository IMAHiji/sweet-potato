import { describe, it, expect, beforeAll } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { like, and, or, eq, count } from 'drizzle-orm';
import * as schema from '../src/server/db/schema.js';
import { stripTones } from '../src/server/lib/pinyin.js';

const migrationsFolder = join(
  fileURLToPath(import.meta.url),
  '../../src/server/db/migrations',
);

// ---- in-memory DB setup ----

const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });

// ---- helpers that mirror the route's query logic ----

const PAGE_SIZE = 48;

function queryCharacters(opts: {
  q?: string;
  level?: number;
  page?: number;
}) {
  const { q = '', level, page = 1 } = opts;
  const conditions = [];

  if (q) {
    const stripped = stripTones(q);
    conditions.push(
      or(
        like(schema.characters.simplified, `%${q}%`),
        like(schema.characters.traditional, `%${q}%`),
        like(schema.characters.definition, `%${q}%`),
        like(schema.characters.pinyinSearch, `%${stripped}%`),
      ),
    );
  }

  if (level !== undefined) {
    conditions.push(eq(schema.characters.hskLevel, level));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = db
    .select({ total: count() })
    .from(schema.characters)
    .where(whereClause)
    .get();
  const total = countResult?.total ?? 0;

  const rows = db
    .select()
    .from(schema.characters)
    .where(whereClause)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  return { rows, total };
}

function queryById(id: number) {
  return db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.id, id))
    .get();
}

// ---- seed data ----

beforeAll(() => {
  migrate(db, { migrationsFolder });

  db.insert(schema.characters)
    .values([
      {
        traditional: '好',
        simplified: '好',
        pinyin: 'hǎo',
        pinyinSearch: 'hao',
        zhuyin: 'ㄏㄠˇ',
        definition: 'good; well; proper; good to; easy to; very; so',
        hskLevel: 1,
        frequencyRank: 10,
      },
      {
        traditional: '學',
        simplified: '学',
        pinyin: 'xué',
        pinyinSearch: 'xue',
        zhuyin: 'ㄒㄩㄝˊ',
        definition: 'to learn; to study; learning',
        hskLevel: 1,
        frequencyRank: 50,
      },
      {
        traditional: '中',
        simplified: '中',
        pinyin: 'zhōng',
        pinyinSearch: 'zhong',
        zhuyin: 'ㄓㄨㄥ',
        definition: 'middle; center; China; in the middle of',
        hskLevel: 1,
        frequencyRank: 5,
      },
      {
        traditional: '飛',
        simplified: '飞',
        pinyin: 'fēi',
        pinyinSearch: 'fei',
        zhuyin: 'ㄈㄟ',
        definition: 'to fly',
        hskLevel: 3,
        frequencyRank: 200,
      },
      {
        traditional: '龍',
        simplified: '龙',
        pinyin: 'lóng',
        pinyinSearch: 'long',
        zhuyin: 'ㄌㄨㄥˊ',
        definition: 'dragon',
        hskLevel: 4,
        frequencyRank: 300,
      },
    ])
    .run();
});

// ---- tests ----

describe('character search — by traditional character', () => {
  it('finds a character by exact traditional form', () => {
    const { rows, total } = queryCharacters({ q: '好' });
    expect(total).toBe(1);
    expect(rows[0]?.traditional).toBe('好');
  });

  it('finds a character by traditional form in a mixed DB', () => {
    const { rows } = queryCharacters({ q: '學' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.traditional).toBe('學');
  });

  it('finds a character by simplified form when it differs', () => {
    const { rows } = queryCharacters({ q: '飞' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.simplified).toBe('飞');
  });
});

describe('character search — by tone-stripped pinyin', () => {
  it('finds 好 by searching "hao" (no tone marks)', () => {
    const { rows, total } = queryCharacters({ q: 'hao' });
    expect(total).toBeGreaterThan(0);
    const found = rows.find((r) => r.traditional === '好');
    expect(found).toBeDefined();
  });

  it('finds 學 by searching "xue"', () => {
    const { rows } = queryCharacters({ q: 'xue' });
    const found = rows.find((r) => r.traditional === '學');
    expect(found).toBeDefined();
  });

  it('finds 飛 by searching "fei"', () => {
    const { rows } = queryCharacters({ q: 'fei' });
    const found = rows.find((r) => r.traditional === '飛');
    expect(found).toBeDefined();
  });
});

describe('character search — by definition keyword', () => {
  it('finds characters whose definition contains "dragon"', () => {
    const { rows } = queryCharacters({ q: 'dragon' });
    const found = rows.find((r) => r.traditional === '龍');
    expect(found).toBeDefined();
  });
});

describe('HSK level filter', () => {
  it('filters to only HSK 1 characters', () => {
    const { rows, total } = queryCharacters({ level: 1 });
    expect(total).toBe(3); // 好, 學, 中
    for (const r of rows) {
      expect(r.hskLevel).toBe(1);
    }
  });

  it('filters to only HSK 3 characters', () => {
    const { rows, total } = queryCharacters({ level: 3 });
    expect(total).toBe(1);
    expect(rows[0]?.traditional).toBe('飛');
  });

  it('combines search and HSK filter', () => {
    const { rows, total } = queryCharacters({ q: 'hao', level: 1 });
    expect(total).toBe(1);
    expect(rows[0]?.traditional).toBe('好');
  });

  it('returns zero results when HSK level has no matches', () => {
    const { total } = queryCharacters({ level: 9 });
    expect(total).toBe(0);
  });
});

describe('pagination', () => {
  it('returns all 5 rows on page 1 with PAGE_SIZE=48', () => {
    const { rows, total } = queryCharacters({ page: 1 });
    expect(total).toBe(5);
    expect(rows.length).toBe(5);
  });

  it('applies offset for page 2 with small page size', () => {
    // Test the offset logic directly with small batches
    const page1 = db
      .select()
      .from(schema.characters)
      .limit(2)
      .offset(0)
      .all();
    const page2 = db
      .select()
      .from(schema.characters)
      .limit(2)
      .offset(2)
      .all();

    expect(page1.length).toBe(2);
    expect(page2.length).toBe(2);
    // Pages should not overlap
    const ids1 = page1.map((r) => r.id);
    const ids2 = page2.map((r) => r.id);
    const overlap = ids1.filter((id) => ids2.includes(id));
    expect(overlap.length).toBe(0);
  });

  it('returns empty array for a page beyond the total', () => {
    const rows = db
      .select()
      .from(schema.characters)
      .limit(PAGE_SIZE)
      .offset(100)
      .all();
    expect(rows.length).toBe(0);
  });
});

describe('character lookup by ID', () => {
  it('returns the character when found', () => {
    // Insert a known character and retrieve by traditional (unique)
    db.insert(schema.characters)
      .values({
        traditional: '水',
        simplified: '水',
        pinyin: 'shuǐ',
        pinyinSearch: 'shui',
        zhuyin: 'ㄕㄨㄟˇ',
        definition: 'water; river',
        hskLevel: 1,
      })
      .run();

    // Look it up by traditional to get the id
    const row = db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.traditional, '水'))
      .get();

    expect(row).toBeDefined();
    const found = queryById(row!.id);
    expect(found).toBeDefined();
    expect(found?.traditional).toBe('水');
  });

  it('returns undefined for a non-existent ID', () => {
    const notFound = queryById(999999);
    expect(notFound).toBeUndefined();
  });
});
