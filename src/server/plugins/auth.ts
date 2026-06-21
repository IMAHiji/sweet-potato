import { eq } from 'drizzle-orm';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, preHandlerHookHandler } from 'fastify';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

const SESSION_USER_KEY = 'userId';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null);

  // Load the session user (without the password hash) onto every request.
  fastify.addHook('preHandler', async (request) => {
    const userId = request.session.get(SESSION_USER_KEY) as number | undefined;
    if (!userId) {
      request.user = null;
      return;
    }
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    request.user = rows[0] ?? null;
  });

  const requireUser: preHandlerHookHandler = (request, reply, done) => {
    if (!request.user) {
      if (request.url.startsWith('/api/')) {
        reply.code(401).send({ error: 'unauthorized' });
      } else {
        reply.redirect(`/login?next=${encodeURIComponent(request.url)}`);
      }
      return;
    }
    done();
  };

  const requireAdmin: preHandlerHookHandler = (request, reply, done) => {
    if (!request.user) {
      reply.redirect(`/login?next=${encodeURIComponent(request.url)}`);
      return;
    }
    if (request.user.role !== 'admin') {
      reply.code(403).render('pages/error', {
        title: 'Forbidden',
        status: 403,
        message: 'This area is for administrators only.',
      });
      return;
    }
    done();
  };

  fastify.decorate('requireUser', requireUser);
  fastify.decorate('requireAdmin', requireAdmin);
};

export default fp(authPlugin, { name: 'auth', dependencies: ['session'] });
