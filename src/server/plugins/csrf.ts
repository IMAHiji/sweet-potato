import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import csrf from '@fastify/csrf-protection';

export default fp(async function csrfPlugin(app: FastifyInstance) {
  await app.register(csrf, {
    sessionPlugin: '@fastify/secure-session',
  });
});
