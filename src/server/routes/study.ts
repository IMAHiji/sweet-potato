import { asc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { characters } from '../db/schema.js';

const StudyQuery = z.object({
  level: z.coerce.number().int().min(1).max(9).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const studyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/study', { preHandler: fastify.requireUser }, async (request, reply) => {
    const parsed = StudyQuery.safeParse(request.query);
    const { level, limit } = parsed.success
      ? parsed.data
      : { level: undefined, limit: 30 };

    const deck = await db
      .select({
        id: characters.id,
        traditional: characters.traditional,
        simplified: characters.simplified,
        pinyin: characters.pinyin,
        zhuyin: characters.zhuyin,
        definition: characters.definition,
      })
      .from(characters)
      .where(level !== undefined ? eq(characters.hskLevel, level) : undefined)
      .orderBy(sql`random()`)
      .limit(limit);

    const levelRows = await db
      .selectDistinct({ level: characters.hskLevel })
      .from(characters)
      .orderBy(asc(characters.hskLevel));
    const levels = levelRows
      .map((r) => r.level)
      .filter((l): l is number => typeof l === 'number');

    // Embed safely inside a <script type="application/json"> tag.
    const deckJson = JSON.stringify(deck).replace(/</g, '\\u003c');

    return reply.render('pages/study', {
      title: 'Study',
      deckJson,
      deckSize: deck.length,
      level: level ?? null,
      limit,
      levels,
    });
  });
};

export default studyRoutes;
