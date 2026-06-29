import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export type Role = 'admin' | 'user';
export type Rating = 'known' | 'again';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').$type<Role>().notNull(),
  displayName: text('display_name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(unixepoch())`,
  ),
});

export const characters = sqliteTable(
  'characters',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    traditional: text('traditional').notNull().unique(),
    simplified: text('simplified').notNull(),
    pinyin: text('pinyin').notNull(),
    pinyinSearch: text('pinyin_search').notNull(),
    zhuyin: text('zhuyin').notNull(),
    definition: text('definition').notNull(),
    hskLevel: integer('hsk_level'),
    frequencyRank: integer('frequency_rank'),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (t) => [
    uniqueIndex('characters_traditional_idx').on(t.traditional),
    index('characters_hsk_level_idx').on(t.hskLevel),
    index('characters_simplified_idx').on(t.simplified),
    index('characters_pinyin_search_idx').on(t.pinyinSearch),
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
    simplified: text('simplified').notNull(),
    pinyin: text('pinyin'),
    zhuyin: text('zhuyin'),
    translation: text('translation').notNull(),
    notes: text('notes'),
    sortOrder: integer('sort_order').default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (t) => [index('sentences_character_id_idx').on(t.characterId)],
);

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
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
  },
  (t) => [index('reviews_user_character_idx').on(t.userId, t.characterId)],
);

export const adminAuditLog = sqliteTable('admin_audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminUserId: integer('admin_user_id').notNull(),
  action: text('action').notNull(),          // 'create' | 'update' | 'delete'
  entityType: text('entity_type').notNull(), // 'character' | 'sentence'
  entityId: integer('entity_id').notNull(),
  oldValues: text('old_values'),             // JSON string
  newValues: text('new_values'),             // JSON string
  performedAt: integer('performed_at').notNull(),
});

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
export type ExampleSentence = typeof exampleSentences.$inferSelect;
export type NewExampleSentence = typeof exampleSentences.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type AdminAuditLog = typeof adminAuditLog.$inferSelect;
export type NewAdminAuditLog = typeof adminAuditLog.$inferInsert;
