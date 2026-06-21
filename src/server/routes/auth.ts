import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { FastifyPluginAsync } from 'fastify';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verify } from '../lib/password.js';

const LoginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  next: z.string().optional(),
});

function safeNext(next: string | undefined): string {
  // Only allow local, in-app redirects.
  return next && next.startsWith('/') && !next.startsWith('//')
    ? next
    : '/characters';
}

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/login', async (request, reply) => {
    if (request.user) return reply.redirect('/characters');
    const query = request.query as { next?: string };
    return reply.render('pages/login', {
      title: 'Log in',
      next: typeof query.next === 'string' ? query.next : '',
      error: null,
    });
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).render('pages/login', {
        title: 'Log in',
        next: '',
        error: 'Please enter your email and password.',
      });
    }
    const { email, password, next } = parsed.data;
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    const user = rows[0];
    const ok = user ? await verify(password, user.passwordHash) : false;

    if (!user || !ok) {
      // Small fixed delay to add friction to credential guessing.
      await new Promise((resolve) => setTimeout(resolve, 400));
      return reply.status(401).render('pages/login', {
        title: 'Log in',
        next: next ?? '',
        error: 'Invalid email or password.',
      });
    }

    request.session.set('userId', user.id);
    return reply.redirect(safeNext(next));
  });

  fastify.post('/logout', async (request, reply) => {
    request.session.delete();
    return reply.redirect('/');
  });
};

export default authRoutes;
