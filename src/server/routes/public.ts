import type { FastifyInstance } from 'fastify';

export default async function publicRoutes(app: FastifyInstance) {
  app.get('/', async (_req, reply) => {
    return reply.renderPage('/pages/home', { title: '地瓜' });
  });
}
