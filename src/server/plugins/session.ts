import fastifyCookie from '@fastify/cookie';
import fastifySecureSession from '@fastify/secure-session';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { env, isProd } from '../env.js';
import type { FlashMessage, FlashType } from '../types.js';

const FLASH_KEY = 'flash';

const sessionPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyCookie);
  await fastify.register(fastifySecureSession, {
    // secret (>=32 chars, validated in env) + a fixed non-secret 16-char salt
    // for key derivation. No session table — state lives in the sealed cookie.
    secret: env.SESSION_SECRET,
    salt: 'sweet-potato-16b',
    cookieName: 'sp_session',
    cookie: {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  });

  // Decorate with null (a primitive default); the onRequest hook assigns the
  // per-request array. Fastify v5 forbids reference-type decorator defaults.
  fastify.decorateRequest('flashMessages', null);

  fastify.decorateReply(
    'flash',
    function (this: FastifyReply, type: FlashType, message: string) {
      const session = this.request.session;
      const existing =
        (session.get(FLASH_KEY) as FlashMessage[] | undefined) ?? [];
      existing.push({ type, message });
      session.set(FLASH_KEY, existing);
    },
  );

  // Read-and-clear flash messages at the start of every request.
  fastify.addHook('onRequest', (request, _reply, done) => {
    const queued = request.session.get(FLASH_KEY) as FlashMessage[] | undefined;
    request.flashMessages = queued ?? [];
    if (queued && queued.length > 0) {
      request.session.set(FLASH_KEY, []);
    }
    done();
  });
};

export default fp(sessionPlugin, { name: 'session' });
