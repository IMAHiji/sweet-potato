import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { characters, exampleSentences, users, reviews } from '../db/schema.js';
import { eq, count, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { pinyinToZhuyin } from '../lib/zhuyin.js';
import { stripTones } from '../lib/pinyin.js';

const PAGE_SIZE = 30;

const characterBody = z.object({
  traditional: z.string().min(1).max(4),
  simplified: z.string().min(1).max(4),
  pinyin: z.string().min(1),
  zhuyin: z.string().min(1),
  definition: z.string().min(1),
  hskLevel: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().min(1).max(9).optional(),
  ),
  frequencyRank: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
});

const sentenceBody = z.object({
  traditional: z.string().min(1),
  simplified: z.string().min(1),
  translation: z.string().min(1),
  pinyin: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  zhuyin: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  notes: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
  sortOrder: z.preprocess(
    (v) => (v === '' || v === undefined ? 0 : v),
    z.coerce.number().int().default(0),
  ),
});

function flashQ(type: 'success' | 'error', message: string): string {
  return `?flash=${encodeURIComponent(type)}&msg=${encodeURIComponent(message)}`;
}

function getFlash(
  flashType: string | undefined,
  msg: string | undefined,
): { type: string; message: string } | undefined {
  if (flashType && msg) return { type: flashType, message: msg };
  return undefined;
}

export default async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireAdmin);

  // GET /admin — dashboard
  app.get('/admin', async (_req, reply) => {
    const charTotalRow = db.select({ total: count() }).from(characters).get();
    const charTotal = charTotalRow?.total ?? 0;
    const byLevel = db
      .select({ level: characters.hskLevel, total: count() })
      .from(characters)
      .groupBy(characters.hskLevel)
      .all();
    const sentenceTotalRow = db.select({ total: count() }).from(exampleSentences).get();
    const sentenceTotal = sentenceTotalRow?.total ?? 0;
    const userTotalRow = db.select({ total: count() }).from(users).get();
    const userTotal = userTotalRow?.total ?? 0;
    const reviewTotalRow = db.select({ total: count() }).from(reviews).get();
    const reviewTotal = reviewTotalRow?.total ?? 0;
    return reply.renderPage('/pages/admin/dashboard', {
      title: 'Admin Dashboard',
      charTotal,
      byLevel,
      sentenceTotal,
      userTotal,
      reviewTotal,
    });
  });

  // GET /admin/characters — list with search + pagination
  app.get<{
    Querystring: { q?: string; page?: string; flash?: string; msg?: string };
  }>('/admin/characters', async (request, reply) => {
    const { q = '', page: pageStr = '1', flash: flashType, msg } = request.query;
    const page = Math.max(1, parseInt(pageStr, 10));
    const offset = (page - 1) * PAGE_SIZE;

    const conditions = q
      ? or(
          like(characters.traditional, `%${q}%`),
          like(characters.simplified, `%${q}%`),
          like(characters.pinyin, `%${q}%`),
          like(characters.definition, `%${q}%`),
        )
      : undefined;

    const charList = db
      .select()
      .from(characters)
      .where(conditions)
      .limit(PAGE_SIZE)
      .offset(offset)
      .all();
    const totalRow = db.select({ total: count() }).from(characters).where(conditions).get();
    const totalCount = totalRow?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const sentenceCounts = db
      .select({ characterId: exampleSentences.characterId, total: count() })
      .from(exampleSentences)
      .groupBy(exampleSentences.characterId)
      .all();
    const countMap = new Map(sentenceCounts.map((r) => [r.characterId, r.total]));

    return reply.renderPage('/pages/admin/characters-list', {
      title: 'Manage Characters',
      characters: charList.map((c) => ({ ...c, sentenceCount: countMap.get(c.id) ?? 0 })),
      q,
      page,
      totalPages,
      flash: getFlash(flashType, msg),
    });
  });

  // GET /admin/characters/new — must register before /:id/edit
  app.get('/admin/characters/new', async (_req, reply) => {
    return reply.renderPage('/pages/admin/character-form', {
      title: 'New Character',
      mode: 'create',
      values: {},
      sentences: [],
    });
  });

  // POST /admin/characters — create
  app.post('/admin/characters', async (request, reply) => {
    const parsed = characterBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.renderPage('/pages/admin/character-form', {
        title: 'New Character',
        mode: 'create',
        error: 'Please fill in all required fields correctly.',
        values: request.body as Record<string, unknown>,
        sentences: [],
      });
    }
    const data = parsed.data;
    const pinyinSearch = stripTones(data.pinyin);
    try {
      const inserted = db
        .insert(characters)
        .values({ ...data, pinyinSearch })
        .returning({ id: characters.id })
        .get();
      if (!inserted) throw new Error('Insert returned no result');
      return reply.redirect(
        `/admin/characters/${inserted.id}/edit${flashQ('success', 'Character created.')}`,
      );
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.renderPage('/pages/admin/character-form', {
          title: 'New Character',
          mode: 'create',
          error: `Traditional character "${data.traditional}" already exists.`,
          values: data,
          sentences: [],
        });
      }
      throw err;
    }
  });

  // GET /admin/characters/:id/edit
  app.get<{
    Params: { id: string };
    Querystring: { flash?: string; msg?: string };
  }>('/admin/characters/:id/edit', async (request, reply) => {
    const charId = parseInt(request.params.id, 10);
    const char = db.select().from(characters).where(eq(characters.id, charId)).get();
    if (!char) {
      return reply.status(404).renderPage('/pages/404', { title: 'Not Found' });
    }
    const sentences = db
      .select()
      .from(exampleSentences)
      .where(eq(exampleSentences.characterId, charId))
      .orderBy(exampleSentences.sortOrder)
      .all();
    const { flash: flashType, msg } = request.query;
    return reply.renderPage('/pages/admin/character-form', {
      title: `Edit ${char.traditional}`,
      mode: 'edit',
      character: char,
      values: char,
      sentences,
      flash: getFlash(flashType, msg),
    });
  });

  // POST /admin/characters/:id — update
  app.post<{ Params: { id: string } }>('/admin/characters/:id', async (request, reply) => {
    const charId = parseInt(request.params.id, 10);
    const char = db.select().from(characters).where(eq(characters.id, charId)).get();
    if (!char) {
      return reply.status(404).renderPage('/pages/404', { title: 'Not Found' });
    }
    const parsed = characterBody.safeParse(request.body);
    if (!parsed.success) {
      const sentences = db
        .select()
        .from(exampleSentences)
        .where(eq(exampleSentences.characterId, charId))
        .all();
      return reply.renderPage('/pages/admin/character-form', {
        title: `Edit ${char.traditional}`,
        mode: 'edit',
        character: char,
        error: 'Please fill in all required fields correctly.',
        values: request.body as Record<string, unknown>,
        sentences,
      });
    }
    const data = parsed.data;
    const pinyinSearch = stripTones(data.pinyin);
    try {
      db.update(characters)
        .set({ ...data, pinyinSearch, updatedAt: new Date() })
        .where(eq(characters.id, charId))
        .run();
      return reply.redirect(
        `/admin/characters/${charId}/edit${flashQ('success', 'Character saved.')}`,
      );
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const sentences = db
          .select()
          .from(exampleSentences)
          .where(eq(exampleSentences.characterId, charId))
          .all();
        return reply.renderPage('/pages/admin/character-form', {
          title: `Edit ${char.traditional}`,
          mode: 'edit',
          character: char,
          error: `Traditional character "${data.traditional}" already exists.`,
          values: data,
          sentences,
        });
      }
      throw err;
    }
  });

  // POST /admin/characters/:id/delete
  app.post<{ Params: { id: string } }>(
    '/admin/characters/:id/delete',
    async (request, reply) => {
      const charId = parseInt(request.params.id, 10);
      db.delete(characters).where(eq(characters.id, charId)).run();
      return reply.redirect(`/admin/characters${flashQ('success', 'Character deleted.')}`);
    },
  );

  // POST /admin/derive-zhuyin — JSON endpoint
  app.post('/admin/derive-zhuyin', async (request, reply) => {
    const body = request.body as { pinyin?: unknown };
    const pinyin = typeof body.pinyin === 'string' ? body.pinyin : '';
    return reply.send({ zhuyin: pinyinToZhuyin(pinyin) });
  });

  // POST /admin/characters/:id/sentences — add sentence
  app.post<{ Params: { id: string } }>(
    '/admin/characters/:id/sentences',
    async (request, reply) => {
      const charId = parseInt(request.params.id, 10);
      const parsed = sentenceBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.redirect(
          `/admin/characters/${charId}/edit${flashQ('error', 'Please fill in all required sentence fields.')}`,
        );
      }
      db.insert(exampleSentences)
        .values({ ...parsed.data, characterId: charId })
        .run();
      return reply.redirect(
        `/admin/characters/${charId}/edit${flashQ('success', 'Sentence added.')}`,
      );
    },
  );

  // POST /admin/sentences/:id — update sentence
  app.post<{ Params: { id: string } }>('/admin/sentences/:id', async (request, reply) => {
    const sentenceId = parseInt(request.params.id, 10);
    const sentence = db
      .select()
      .from(exampleSentences)
      .where(eq(exampleSentences.id, sentenceId))
      .get();
    if (!sentence) {
      return reply.status(404).renderPage('/pages/404', { title: 'Not Found' });
    }
    const parsed = sentenceBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.redirect(
        `/admin/characters/${sentence.characterId}/edit${flashQ('error', 'Invalid sentence data.')}`,
      );
    }
    db.update(exampleSentences)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(exampleSentences.id, sentenceId))
      .run();
    return reply.redirect(
      `/admin/characters/${sentence.characterId}/edit${flashQ('success', 'Sentence updated.')}`,
    );
  });

  // POST /admin/sentences/:id/delete
  app.post<{ Params: { id: string } }>(
    '/admin/sentences/:id/delete',
    async (request, reply) => {
      const sentenceId = parseInt(request.params.id, 10);
      const sentence = db
        .select()
        .from(exampleSentences)
        .where(eq(exampleSentences.id, sentenceId))
        .get();
      if (!sentence) {
        return reply.redirect('/admin/characters');
      }
      const charId = sentence.characterId;
      db.delete(exampleSentences).where(eq(exampleSentences.id, sentenceId)).run();
      return reply.redirect(
        `/admin/characters/${charId}/edit${flashQ('success', 'Sentence deleted.')}`,
      );
    },
  );
}
