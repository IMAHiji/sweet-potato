import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { characterAudio } from '../db/schema.js';

/**
 * Serves the pre-rendered Azure zh-TW TTS audio for a character straight from
 * the SQLite BLOB. Cached aggressively — the audio for a given character id is
 * immutable once seeded.
 */
const audioRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/audio/:characterId',
    { preHandler: fastify.requireUser },
    async (request, reply) => {
      const characterId = Number(
        (request.params as { characterId: string }).characterId,
      );
      if (!Number.isInteger(characterId)) return reply.callNotFound();

      const rows = await db
        .select({ mime: characterAudio.mime, data: characterAudio.data })
        .from(characterAudio)
        .where(eq(characterAudio.characterId, characterId))
        .limit(1);
      const audio = rows[0];
      if (!audio) return reply.callNotFound();

      return reply
        .header('Content-Type', audio.mime)
        .header('Cache-Control', 'public, max-age=31536000, immutable')
        .send(audio.data);
    },
  );
};

export default audioRoutes;
