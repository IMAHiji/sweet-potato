import type { FastifyInstance } from 'fastify';
import { like, and, or, eq, count } from 'drizzle-orm';
import { db } from '../db/client.js';
import { characters, exampleSentences } from '../db/schema.js';
import { stripTones } from '../lib/pinyin.js';

const PAGE_SIZE = 48;

export default async function characterRoutes(app: FastifyInstance) {
  // A1 — Browse page
  app.get('/characters', { preHandler: app.requireUser }, async (request, reply) => {
    const query = request.query as { q?: string; level?: string; page?: string };
    const q = (query.q?.trim() ?? '').slice(0, 100);
    const rawLevel = query.level ? parseInt(query.level, 10) : NaN;
    const level = isNaN(rawLevel) ? undefined : rawLevel;
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);

    const conditions = [];

    if (q) {
      const stripped = stripTones(q);
      conditions.push(
        or(
          like(characters.simplified, `%${q}%`),
          like(characters.traditional, `%${q}%`),
          like(characters.definition, `%${q}%`),
          like(characters.pinyinSearch, `%${stripped}%`),
        ),
      );
    }

    if (level !== undefined) {
      conditions.push(eq(characters.hskLevel, level));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = db
      .select({ total: count() })
      .from(characters)
      .where(whereClause)
      .get();
    const total = countResult?.total ?? 0;

    const chars = db
      .select()
      .from(characters)
      .where(whereClause)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE)
      .all();

    return reply.renderPage('/pages/characters', {
      title: 'Browse Characters',
      characters: chars,
      total,
      page,
      pageSize: PAGE_SIZE,
      q,
      level: level ?? '',
    });
  });

  // A2 — Detail page
  app.get('/characters/:id', { preHandler: app.requireUser }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);

    if (isNaN(id)) {
      return reply.status(404).renderPage('/pages/404', { title: 'Not found' });
    }

    const char = db.select().from(characters).where(eq(characters.id, id)).get();

    if (!char) {
      return reply.status(404).renderPage('/pages/404', { title: 'Not found' });
    }

    const sentences = db
      .select()
      .from(exampleSentences)
      .where(eq(exampleSentences.characterId, id))
      .orderBy(exampleSentences.sortOrder, exampleSentences.id)
      .all();

    return reply.renderPage('/pages/character-detail', {
      title: char.traditional,
      char,
      sentences,
    });
  });
}
