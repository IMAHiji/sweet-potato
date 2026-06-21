import type { preHandlerHookHandler } from 'fastify';
import type { PublicUser } from './db/schema.js';

export type FlashType = 'success' | 'error' | 'info';
export interface FlashMessage {
  type: FlashType;
  message: string;
}

export interface RenderOptions {
  /** Layout template (without extension), or false for no layout. */
  layout?: string | false;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Authenticated user (without password hash), or null. */
    user: PublicUser | null;
    /** Flash messages carried over from the previous request (read once). */
    flashMessages: FlashMessage[] | null;
  }

  interface FastifyReply {
    /** Render an Eta page through the base (or given) layout with shared locals. */
    render(
      page: string,
      data?: Record<string, unknown>,
      opts?: RenderOptions,
    ): Promise<FastifyReply>;
    /** Queue a flash message to show on the next rendered page. */
    flash(type: FlashType, message: string): void;
  }

  interface FastifyInstance {
    /** preHandler: redirect anonymous users to /login. */
    requireUser: preHandlerHookHandler;
    /** preHandler: 403 for non-admins. */
    requireAdmin: preHandlerHookHandler;
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    userId: number;
    flash: FlashMessage[];
  }
}
