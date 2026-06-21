import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export type Role = 'admin' | 'user';
export type Rating = 'known' | 'again';

const createdAt = timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow();

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  // scrypt format: "<saltHex>:<hashHex>"
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<Role>().notNull().default('user'),
  displayName: text('display_name'),
  createdAt,
});

export const characters = pgTable(
  'characters',
  {
    id: serial('id').primaryKey(),
    traditional: text('traditional').notNull().unique(),
    simplified: text('simplified').notNull(),
    pinyin: text('pinyin').notNull(), // tone-marked, e.g. "nǐ"
    zhuyin: text('zhuyin').notNull(), // e.g. "ㄋㄧˇ"
    definition: text('definition').notNull(),
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

export const exampleSentences = pgTable(
  'example_sentences',
  {
    id: serial('id').primaryKey(),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    traditional: text('traditional').notNull(),
    simplified: text('simplified').notNull(),
    pinyin: text('pinyin'),
    zhuyin: text('zhuyin'),
    translation: text('translation').notNull(),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt,
    updatedAt,
  },
  (t) => [index('example_sentences_character_id_idx').on(t.characterId)],
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    rating: text('rating').$type<Rating>().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('reviews_user_character_idx').on(t.userId, t.characterId)],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ExampleSentence = typeof exampleSentences.$inferSelect;
export type NewExampleSentence = typeof exampleSentences.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

/** User shape exposed to templates / requests (never includes the hash). */
export type PublicUser = Omit<User, 'passwordHash'>;
