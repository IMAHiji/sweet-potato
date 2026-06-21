import type { FastifyPluginAsync } from 'fastify';

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_request, reply) => {
    return reply.render('pages/home', { title: 'Sweet Potato' });
  });

  // Health check for Railway/Render.
  fastify.get('/healthz', async () => ({ ok: true }));
};

export default publicRoutes;
