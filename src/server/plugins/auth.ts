import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyInstance {
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  // Load user from session on every request
  app.addHook('preHandler', async (request: FastifyRequest) => {
    const userId = request.session.get('userId');
    if (userId) {
      const user = db.select().from(users).where(eq(users.id, userId)).get();
      request.user = user ?? null;
    } else {
      request.user = null;
    }
  });

  app.decorate('requireUser', async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!request.user) {
      return reply.redirect('/login');
    }
  });

  app.decorate('requireAdmin', async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!request.user) {
      return reply.redirect('/login');
    }
    if (request.user.role !== 'admin') {
      return reply.status(403).renderPage('/pages/error', {
        title: 'Forbidden',
      });
    }
  });
});
