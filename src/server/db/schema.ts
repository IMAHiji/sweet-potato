import { sql } from 'drizzle-orm';
import {
  blob,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export type Role = 'admin' | 'user';
export type Rating = 'known' | 'again';

// SQLite has no native timestamp type; store as Unix seconds (mode: 'timestamp'
// gives us JS `Date`s on the way in/out) defaulting to now.
const createdAt = integer('created_at', { mode: 'timestamp' })
  .notNull()
  .default(sql`(unixepoch())`);
const updatedAt = integer('updated_at', { mode: 'timestamp' })
  .notNull()
  .default(sql`(unixepoch())`);

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  // scrypt format: "<saltHex>:<hashHex>"
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<Role>().notNull().default('user'),
  displayName: text('display_name'),
  createdAt,
});

export const characters = sqliteTable(
  'characters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    traditional: text('traditional').notNull().unique(),
    simplified: text('simplified').notNull(),
    pinyin: text('pinyin').notNull(), // tone-marked, e.g. "nǐ" (MOEDICT)
    zhuyin: text('zhuyin').notNull(), // e.g. "ㄋㄧˇ" (MOEDICT)
    // English gloss from CC-CEDICT.
    glossEn: text('gloss_en'),
    // Chinese definition from MOEDICT 國語.
    definitionZh: text('definition_zh'),
    hskLevel: integer('hsk_level'),
    frequencyRank: integer('frequency_rank'),
    createdAt,
    updatedAt,
  },
  (t) => [
    index('characters_hsk_level_idx').on(t.hskLevel),
    index('characters_simplified_idx').on(t.simplified),
  ],
);

export const exampleSentences = sqliteTable(
  'example_sentences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    traditional: text('traditional').notNull(),
    simplified: text('simplified'),
    pinyin: text('pinyin'),
    zhuyin: text('zhuyin'),
    // Nullable: the automated sources (MOEDICT/CEDICT) don't provide aligned
    // sentence translations, so imported sentences may be Chinese-only.
    translation: text('translation'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index('example_sentences_character_id_idx').on(t.characterId)],
);

// Pre-rendered Azure zh-TW TTS audio for a character, stored inline as a BLOB.
// Kept in its own table (1:1 with characters) so the bytes never load on the
// list/study queries that select from `characters`.
export const characterAudio = sqliteTable('character_audio', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  characterId: integer('character_id')
    .notNull()
    .unique()
    .references(() => characters.id, { onDelete: 'cascade' }),
  mime: text('mime').notNull(), // e.g. "audio/mpeg"
  voice: text('voice').notNull(), // e.g. "zh-TW-HsiaoChenNeural"
  data: blob('data', { mode: 'buffer' }).notNull().$type<Buffer>(),
  createdAt,
});

export const reviews = sqliteTable(
  'reviews',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    rating: text('rating').$type<Rating>().notNull(),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [index('reviews_user_character_idx').on(t.userId, t.characterId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ExampleSentence = typeof exampleSentences.$inferSelect;
export type NewExampleSentence = typeof exampleSentences.$inferInsert;
export type CharacterAudio = typeof characterAudio.$inferSelect;
export type NewCharacterAudio = typeof characterAudio.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

/** User shape exposed to templates / requests (never includes the hash). */
export type PublicUser = Omit<User, 'passwordHash'>;
