import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { characters } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const querySchema = z.object({
  level: z.coerce.number().int().min(1).max(9).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export default async function studyRoutes(app: FastifyInstance) {
  app.get('/study', { preHandler: app.requireUser }, async (request, reply) => {
    const rawQuery = request.query as Record<string, string | undefined>;
    const deckReady = 'limit' in rawQuery || 'level' in rawQuery;

    const { level, limit } = querySchema.parse(request.query);

    const deck = deckReady
      ? level !== undefined
        ? db
            .select()
            .from(characters)
            .where(eq(characters.hskLevel, level))
            .orderBy(sql`RANDOM()`)
            .limit(limit)
            .all()
        : db.select().from(characters).orderBy(sql`RANDOM()`).limit(limit).all()
      : [];

    return reply.renderPage('/pages/study', {
      title: 'Study',
      deck: JSON.stringify(deck),
      level,
      limit,
      deckReady,
    });
  });
}
