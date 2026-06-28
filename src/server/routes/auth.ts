import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { verify } from '../lib/password.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  app.get('/login', async (request, reply) => {
    if (request.user) return reply.redirect('/characters');
    return reply.renderPage('/pages/login', { title: 'Sign in' });
  });

  app.post('/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } }, async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.renderPage('/pages/login', {
        title: 'Sign in',
        error: 'Invalid email or password.',
      });
    }
    const { email, password } = parsed.data;
    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (!user || !(await verify(password, user.passwordHash))) {
      return reply.renderPage('/pages/login', {
        title: 'Sign in',
        error: 'Invalid email or password.',
        email,
      });
    }
    request.session.set('userId', user.id);
    return reply.redirect('/characters');
  });

  app.post('/logout', async (request, reply) => {
    request.session.delete();
    return reply.redirect('/');
  });
}
