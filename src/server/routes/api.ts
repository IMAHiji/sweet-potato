import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { reviews } from '../db/schema.js';

const ReviewSchema = z.object({
  characterId: z.coerce.number().int().positive(),
  rating: z.enum(['known', 'again']),
});

const apiRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api/reviews',
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      if (!request.user) return reply.status(401).send({ error: 'unauthorized' });
      const parsed = ReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: 'invalid_body' });
      }
      await db.insert(reviews).values({
        userId: request.user.id,
        characterId: parsed.data.characterId,
        rating: parsed.data.rating,
      });
      return { ok: true };
    },
  );
};

export default apiRoutes;
