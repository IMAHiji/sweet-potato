import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import secureSession from '@fastify/secure-session';
import { env } from '../env.js';

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: number;
  }
}

export default fp(async function sessionPlugin(app: FastifyInstance) {
  await app.register(secureSession, {
    secret: env.SESSION_SECRET,
    salt: 'sweetpotato_salt',  // exactly 16 bytes required by libsodium
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    },
  });
});
