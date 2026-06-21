import { asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import {
  characters,
  exampleSentences,
  reviews,
  users,
} from '../db/schema.js';
import { pinyinToZhuyin } from '../lib/zhuyin.js';

const PAGE_SIZE = 50;

const optionalLevel = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().min(1).max(9).optional(),
);
const optionalRank = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number().int().min(0).optional(),
);
const sortOrder = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? 0 : v),
  z.coerce.number().int().default(0),
);
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null));

const CharacterSchema = z.object({
  traditional: z.string().trim().min(1, 'Required'),
  simplified: z.string().trim().min(1, 'Required'),
  pinyin: z.string().trim().min(1, 'Required'),
  zhuyin: z.string().trim().min(1, 'Required'),
  definition: z.string().trim().min(1, 'Required'),
  hskLevel: optionalLevel,
  frequencyRank: optionalRank,
});

const SentenceSchema = z.object({
  traditional: z.string().trim().min(1, 'Required'),
  simplified: z.string().trim().min(1, 'Required'),
  translation: z.string().trim().min(1, 'Required'),
  pinyin: optionalText,
  zhuyin: optionalText,
  notes: optionalText,
  sortOrder,
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = issue.message;
  }
  return out;
}

function isUniqueViolation(err: unknown): boolean {
  // Drizzle wraps pg errors in DrizzleQueryError; the SQLSTATE code lives on the
  // original error in `.cause`.
  const codeOf = (e: unknown): string | undefined =>
    typeof e === 'object' && e !== null && 'code' in e
      ? (e as { code?: string }).code
      : undefined;
  if (codeOf(err) === '23505') return true;
  return codeOf((err as { cause?: unknown })?.cause) === '23505';
}

async function loadSentences(characterId: number) {
  return db
    .select()
    .from(exampleSentences)
    .where(eq(exampleSentences.characterId, characterId))
    .orderBy(asc(exampleSentences.sortOrder), asc(exampleSentences.id));
}

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Guard every /admin route.
  fastify.addHook('preHandler', fastify.requireAdmin);

  // ---- Dashboard --------------------------------------------------------

  fastify.get('/', async (_request, reply) => {
    const [charRow] = await db.select({ value: count() }).from(characters);
    const [sentenceRow] = await db
      .select({ value: count() })
      .from(exampleSentences);
    const [userRow] = await db.select({ value: count() }).from(users);
    const [reviewRow] = await db.select({ value: count() }).from(reviews);
    const perLevel = await db
      .select({ level: characters.hskLevel, value: count() })
      .from(characters)
      .groupBy(characters.hskLevel)
      .orderBy(asc(characters.hskLevel));

    return reply.render('pages/admin/dashboard', {
      title: 'Admin',
      counts: {
        characters: Number(charRow?.value ?? 0),
        sentences: Number(sentenceRow?.value ?? 0),
        users: Number(userRow?.value ?? 0),
        reviews: Number(reviewRow?.value ?? 0),
      },
      perLevel: perLevel.map((r) => ({
        level: r.level,
        value: Number(r.value),
      })),
    });
  });

  // ---- Character list ---------------------------------------------------

  fastify.get('/characters', async (request, reply) => {
    const query = z
      .object({
        q: z.string().trim().default(''),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(request.query);
    const { q, page } = query.success ? query.data : { q: '', page: 1 };

    const where = q
      ? or(
          ilike(characters.simplified, `%${q}%`),
          ilike(characters.traditional, `%${q}%`),
          ilike(characters.pinyin, `%${q}%`),
          ilike(characters.definition, `%${q}%`),
        )
      : undefined;

    const offset = (page - 1) * PAGE_SIZE;
    const rows = await db
      .select({
        id: characters.id,
        traditional: characters.traditional,
        simplified: characters.simplified,
        pinyin: characters.pinyin,
        zhuyin: characters.zhuyin,
        hskLevel: characters.hskLevel,
        sentenceCount: sql<number>`(select count(*)::int from ${exampleSentences} where ${exampleSentences.characterId} = ${characters.id})`,
      })
      .from(characters)
      .where(where)
      .orderBy(asc(characters.hskLevel), asc(characters.id))
      .limit(PAGE_SIZE)
      .offset(offset);

    const totalRow = await db
      .select({ value: count() })
      .from(characters)
      .where(where);
    const total = Number(totalRow[0]?.value ?? 0);

    return reply.render('pages/admin/characters-list', {
      title: 'Manage characters',
      rows,
      q,
      page,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  });

  // ---- Create -----------------------------------------------------------

  fastify.get('/characters/new', async (_request, reply) => {
    return reply.render('pages/admin/character-form', {
      title: 'New character',
      mode: 'new',
      values: {},
      errors: {},
      sentences: [],
    });
  });

  fastify.post('/characters', async (request, reply) => {
    const parsed = CharacterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).render('pages/admin/character-form', {
        title: 'New character',
        mode: 'new',
        values: request.body ?? {},
        errors: fieldErrors(parsed.error),
        sentences: [],
      });
    }
    try {
      const [inserted] = await db
        .insert(characters)
        .values(parsed.data)
        .returning({ id: characters.id });
      reply.flash('success', `Created ${parsed.data.traditional}.`);
      return reply.redirect(`/admin/characters/${inserted!.id}/edit`);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.status(409).render('pages/admin/character-form', {
          title: 'New character',
          mode: 'new',
          values: request.body ?? {},
          errors: { traditional: 'A character with this traditional form already exists.' },
          sentences: [],
        });
      }
      throw err;
    }
  });

  // ---- Edit -------------------------------------------------------------

  fastify.get('/characters/:id/edit', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.callNotFound();
    const rows = await db
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);
    const character = rows[0];
    if (!character) return reply.callNotFound();

    return reply.render('pages/admin/character-form', {
      title: `Edit ${character.traditional}`,
      mode: 'edit',
      id,
      values: character,
      errors: {},
      sentences: await loadSentences(id),
    });
  });

  fastify.post('/characters/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.callNotFound();
    const parsed = CharacterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).render('pages/admin/character-form', {
        title: 'Edit character',
        mode: 'edit',
        id,
        values: { ...(request.body as object), id },
        errors: fieldErrors(parsed.error),
        sentences: await loadSentences(id),
      });
    }
    try {
      const result = await db
        .update(characters)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(characters.id, id))
        .returning({ id: characters.id });
      if (result.length === 0) return reply.callNotFound();
      reply.flash('success', 'Saved changes.');
      return reply.redirect(`/admin/characters/${id}/edit`);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return reply.status(409).render('pages/admin/character-form', {
          title: 'Edit character',
          mode: 'edit',
          id,
          values: { ...(request.body as object), id },
          errors: { traditional: 'A character with this traditional form already exists.' },
          sentences: await loadSentences(id),
        });
      }
      throw err;
    }
  });

  fastify.post('/characters/:id/delete', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.callNotFound();
    await db.delete(characters).where(eq(characters.id, id));
    reply.flash('success', 'Character deleted.');
    return reply.redirect('/admin/characters');
  });

  // ---- Example sentences ------------------------------------------------

  fastify.post('/characters/:id/sentences', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.callNotFound();
    const parsed = SentenceSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.flash('error', 'Could not add sentence: all of traditional, simplified and translation are required.');
      return reply.redirect(`/admin/characters/${id}/edit`);
    }
    await db
      .insert(exampleSentences)
      .values({ ...parsed.data, characterId: id });
    reply.flash('success', 'Sentence added.');
    return reply.redirect(`/admin/characters/${id}/edit`);
  });

  fastify.post('/sentences/:id', async (request, reply) => {
    const sentenceId = Number((request.params as { id: string }).id);
    if (!Number.isInteger(sentenceId)) return reply.callNotFound();
    const parsed = SentenceSchema.safeParse(request.body);
    const existing = await db
      .select({ characterId: exampleSentences.characterId })
      .from(exampleSentences)
      .where(eq(exampleSentences.id, sentenceId))
      .limit(1);
    const characterId = existing[0]?.characterId;
    if (!characterId) return reply.callNotFound();

    if (!parsed.success) {
      reply.flash('error', 'Could not save sentence: required fields are missing.');
      return reply.redirect(`/admin/characters/${characterId}/edit`);
    }
    await db
      .update(exampleSentences)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(exampleSentences.id, sentenceId));
    reply.flash('success', 'Sentence updated.');
    return reply.redirect(`/admin/characters/${characterId}/edit`);
  });

  fastify.post('/sentences/:id/delete', async (request, reply) => {
    const sentenceId = Number((request.params as { id: string }).id);
    if (!Number.isInteger(sentenceId)) return reply.callNotFound();
    const existing = await db
      .select({ characterId: exampleSentences.characterId })
      .from(exampleSentences)
      .where(eq(exampleSentences.id, sentenceId))
      .limit(1);
    const characterId = existing[0]?.characterId;
    if (!characterId) return reply.callNotFound();
    await db.delete(exampleSentences).where(eq(exampleSentences.id, sentenceId));
    reply.flash('success', 'Sentence deleted.');
    return reply.redirect(`/admin/characters/${characterId}/edit`);
  });

  // ---- Zhuyin derive helper (used by the editor's button) ---------------

  fastify.post('/derive-zhuyin', async (request, reply) => {
    const parsed = z
      .object({ pinyin: z.string().min(1) })
      .safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid' });
    try {
      return { zhuyin: pinyinToZhuyin(parsed.data.pinyin) };
    } catch {
      return reply.status(422).send({ error: 'could not derive zhuyin' });
    }
  });
};

export default adminRoutes;
