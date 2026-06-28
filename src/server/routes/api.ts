import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { reviews, characters } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const reviewBody = z.object({
  characterId: z.number().int().positive(),
  rating: z.enum(['known', 'again']),
});

export default async function apiRoutes(app: FastifyInstance) {
  app.post(
    '/api/reviews',
    {
      preHandler: app.requireUser,
      config: {
        rateLimit: {
          max: 100,
          timeWindow: '1 minute',
          keyGenerator: (req) => String(req.session.get('userId') ?? req.ip),
        },
      },
    },
    async (request, reply) => {
    const parsed = reviewBody.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid body' });

    const { characterId, rating } = parsed.data;

    // Verify character exists
    const char = db.select().from(characters).where(eq(characters.id, characterId)).get();
    if (!char) return reply.status(400).send({ error: 'Character not found' });

    db.insert(reviews)
      .values({
        userId: request.user!.id,
        characterId,
        rating,
      })
      .run();

    return reply.send({ ok: true });
  });
}
