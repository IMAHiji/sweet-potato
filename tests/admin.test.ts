import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { fileURLToPath } from 'url';
import { join } from 'path';
import { eq, like } from 'drizzle-orm';
import * as schema from '../src/server/db/schema.js';
import { pinyinToZhuyin } from '../src/server/lib/zhuyin.js';
import { stripTones } from '../src/server/lib/pinyin.js';

const migrationsFolder = join(
  fileURLToPath(import.meta.url),
  '../../src/server/db/migrations',
);

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(() => {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
});

afterEach(() => {
  db.delete(schema.reviews).run();
  db.delete(schema.exampleSentences).run();
  db.delete(schema.characters).run();
  db.delete(schema.users).run();
});

const baseChar = {
  traditional: '你',
  simplified: '你',
  pinyin: 'nǐ',
  pinyinSearch: 'ni',
  zhuyin: 'ㄋㄧˇ',
  definition: 'you',
};

describe('admin — character CRUD', () => {
  it('insert with pinyinSearch = stripTones(pinyin) → search by pinyinSearch finds it', () => {
    const pinyin = 'nǐ hǎo';
    const pinyinSearch = stripTones(pinyin);
    expect(pinyinSearch).toBe('nihao');
    db.insert(schema.characters)
      .values({ ...baseChar, pinyin, pinyinSearch, traditional: '你好', simplified: '你好' })
      .run();
    const results = db
      .select()
      .from(schema.characters)
      .where(like(schema.characters.pinyinSearch, `%nihao%`))
      .all();
    expect(results).toHaveLength(1);
    expect(results[0]?.traditional).toBe('你好');
  });

  it('duplicate traditional → SQLITE_CONSTRAINT_UNIQUE', () => {
    db.insert(schema.characters).values(baseChar).run();
    let caughtError: unknown;
    try {
      db.insert(schema.characters)
        .values({ ...baseChar, definition: 'you (duplicate)' })
        .run();
    } catch (err) {
      caughtError = err;
    }
    expect(caughtError).toBeDefined();
    expect((caughtError as { code?: string }).code).toBe('SQLITE_CONSTRAINT_UNIQUE');
  });

  it('delete character → cascades its sentences', () => {
    const inserted = db
      .insert(schema.characters)
      .values(baseChar)
      .returning({ id: schema.characters.id })
      .get();
    expect(inserted).toBeDefined();
    const charId = inserted!.id;

    db.insert(schema.exampleSentences)
      .values({
        characterId: charId,
        traditional: '你好',
        simplified: '你好',
        translation: 'Hello',
      })
      .run();

    const before = db
      .select()
      .from(schema.exampleSentences)
      .where(eq(schema.exampleSentences.characterId, charId))
      .all();
    expect(before).toHaveLength(1);

    db.delete(schema.characters).where(eq(schema.characters.id, charId)).run();

    const after = db
      .select()
      .from(schema.exampleSentences)
      .where(eq(schema.exampleSentences.characterId, charId))
      .all();
    expect(after).toHaveLength(0);
  });

  it('sentence insert for a character → appears when querying by characterId', () => {
    const inserted = db
      .insert(schema.characters)
      .values(baseChar)
      .returning({ id: schema.characters.id })
      .get();
    const charId = inserted!.id;

    db.insert(schema.exampleSentences)
      .values({
        characterId: charId,
        traditional: '你好嗎',
        simplified: '你好吗',
        translation: 'How are you?',
        pinyin: 'nǐ hǎo ma',
      })
      .run();

    const sentences = db
      .select()
      .from(schema.exampleSentences)
      .where(eq(schema.exampleSentences.characterId, charId))
      .all();
    expect(sentences).toHaveLength(1);
    expect(sentences[0]?.traditional).toBe('你好嗎');
    expect(sentences[0]?.characterId).toBe(charId);
  });
});

describe('admin — derive-zhuyin logic', () => {
  it('pinyinToZhuyin("nǐ") returns "ㄋㄧˇ"', () => {
    expect(pinyinToZhuyin('nǐ')).toBe('ㄋㄧˇ');
  });
});
