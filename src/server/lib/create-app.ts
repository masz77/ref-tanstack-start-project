import { createEmitter } from '@hono/event-emitter'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { Schema } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { requestId } from 'hono/request-id'
import { notFound, onError, serveEmojiFavicon } from 'stoker/middlewares'
import { defaultHook } from 'stoker/openapi'
import { createAuthForRequest } from '@/server/auth'
import {
  onAuthSessionCreated,
  onSubscriptionChanged,
  onUserCreated,
  onUserDeleted,
} from '@/server/infrastructure/events/listeners'
import type { AppEvents } from '@/server/infrastructure/events/types'
import { cacheControlMiddleware } from '@/server/lib/cache-control'
import { CloudflareRateLimitStore } from '@/server/lib/cloudflare-rate-limit-store'
import { requestLogMiddleware } from '@/server/middleware/request-log'
import type { AppBindings, AppOpenAPI } from '@/server/shared/types'

// 2026-05-24: Removed the `: OpenAPIHono<AppBindings>` return annotation. Annotating
// the return type pins the `Schema` generic to its default `{}`, so when callers chain
// `.openapi(...)`/`.get(...)` the accumulated route schemas can't widen the type — RPC
// inference (`hc<AppType>`) needs that widened Schema to flow through. Let it infer.
export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  })
}

// 2026-05-24: No return annotation here either — keep the inferred Schema so the
// router chain in app.ts (`createApp().route(...).route(...)`) accumulates real route
// types into AppType instead of collapsing to `{}`.
export default function createApp() {
  // Create emitter with registered listeners
  const emitter = createEmitter<AppEvents>()

  // Register event listeners
  emitter.on('user:created', onUserCreated)
  emitter.on('user:deleted', onUserDeleted)
  emitter.on('auth:session-created', onAuthSessionCreated)
  emitter.on('subscription:changed', onSubscriptionChanged)

  const app = createRouter()
  app
    // 2026-07-08: registered cacheControlMiddleware (outermost) — why: stamps after every
    // route incl. /api/auth/*; see docs/ARCHITECTURE/response-caching.md
    .use(cacheControlMiddleware())
    .use(requestId())
    .use('*', async (c, next) => {
      const auth = createAuthForRequest(c.env, c.req.raw)
      c.set('auth', auth)
      c.set('emitter', emitter)
      await next()
    })
    .use(
      rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // limit each IP to 100 requests per windowMs
        store: new CloudflareRateLimitStore(),
        keyGenerator: (c) =>
          c.req.header('cf-connecting-ip') ??
          c.req.header('x-forwarded-for') ??
          c.req.header('x-real-ip') ??
          c.req.raw.headers.get('host') ??
          'unknown',
      }),
    )
    .use(serveEmojiFavicon('📝'))
    // 2026-06-05: Request logging is now a single structured console.log line per request
    // (Cloudflare Workers Logs is the only sink). Replaces the old `_log` DB table stack.
    .use(requestLogMiddleware())

  app.notFound(notFound)
  app.onError(onError)
  return app
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  const app = createApp()

  return app.route('/', router)
}
