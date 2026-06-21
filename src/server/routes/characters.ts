import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { characters, exampleSentences } from '../db/schema.js';

const PAGE_SIZE = 48;

const BrowseQuery = z.object({
  q: z.string().trim().default(''),
  level: z.coerce.number().int().min(1).max(9).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

async function distinctLevels(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ level: characters.hskLevel })
    .from(characters)
    .orderBy(asc(characters.hskLevel));
  return rows
    .map((r) => r.level)
    .filter((l): l is number => typeof l === 'number');
}

const charactersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/characters',
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const parsed = BrowseQuery.safeParse(request.query);
      const { q, level, page } = parsed.success
        ? parsed.data
        : { q: '', level: undefined, page: 1 };

      const filters = [];
      if (q) {
        const like = `%${q}%`;
        filters.push(
          or(
            ilike(characters.simplified, like),
            ilike(characters.traditional, like),
            ilike(characters.pinyin, like),
            ilike(characters.definition, like),
          ),
        );
      }
      if (level !== undefined) filters.push(eq(characters.hskLevel, level));
      const where = filters.length ? and(...filters) : undefined;

      const offset = (page - 1) * PAGE_SIZE;
      const rows = await db
        .select()
        .from(characters)
        .where(where)
        .orderBy(
          asc(characters.hskLevel),
          asc(characters.frequencyRank),
          asc(characters.id),
        )
        .limit(PAGE_SIZE)
        .offset(offset);

      const totalRow = await db
        .select({ value: count() })
        .from(characters)
        .where(where);
      const total = Number(totalRow[0]?.value ?? 0);
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

      return reply.render('pages/characters', {
        title: 'Browse characters',
        rows,
        q,
        level: level ?? null,
        page,
        totalPages,
        total,
        pageSize: PAGE_SIZE,
        levels: await distinctLevels(),
      });
    },
  );

  fastify.get(
    '/characters/:id',
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id)) return reply.callNotFound();

      const rows = await db
        .select()
        .from(characters)
        .where(eq(characters.id, id))
        .limit(1);
      const character = rows[0];
      if (!character) return reply.callNotFound();

      const sentences = await db
        .select()
        .from(exampleSentences)
        .where(eq(exampleSentences.characterId, id))
        .orderBy(asc(exampleSentences.sortOrder), asc(exampleSentences.id));

      return reply.render('pages/character-detail', {
        title: `${character.traditional} · ${character.pinyin}`,
        character,
        sentences,
      });
    },
  );
};

export default charactersRoutes;
