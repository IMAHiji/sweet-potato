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
    // The salt must be a static 16-byte string per application.
    // @fastify/secure-session uses libsodium's XChaCha20-Poly1305 AEAD cipher,
    // which derives the actual encryption key from (secret + salt) via scrypt.
    // Security comes from SESSION_SECRET being random and secret — not from this
    // salt, which is intentionally fixed per-deployment.
    // WARNING: changing this value invalidates all existing sessions.
    salt: 'sweetpotato_salt', // 16 bytes — do not change without a session migration
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    },
  });
});
