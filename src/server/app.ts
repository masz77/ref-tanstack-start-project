import { healthRouter } from '@/modules/health/index.server'
import { authRouter } from '@/modules/identity/index.server'
import configureOpenAPI from '@/server/lib/configure-open-api'
import createApp from '@/server/lib/create-app'

export function buildApp() {
  // why: one Worker serves both the pages and the API, so the Hono app is mounted
  // under /api and the browser calls its own origin (no CORS, no second deployment).
  const app = createApp().basePath('/api')

  configureOpenAPI(app)

  const routes = app.route('/', authRouter).route('/', healthRouter)

  return routes
}

export type AppType = ReturnType<typeof buildApp>

// 2026-10-22: dropped the in-memory CloudflareRateLimitStore; the limiter now reads the Cloudflare binding, so this no longer applies to it.
// why: the app is built ONCE per isolate, not per request, because rebuilding would redo the whole OpenAPI tree and event emitter on every call.
export const app = buildApp()

// why: the Workers runtime exposes the bindings (D1, KV, ...) through
// `cloudflare:workers`, not through the request. Imported lazily so this module
// stays loadable outside the Workers runtime (vitest, scripts).
export async function forwardToApi(request: Request): Promise<Response> {
  const { env } = await import('cloudflare:workers')

  // shortcut: `c.executionCtx` throws because src/routes/api/-handler.ts passes only the
  // request; forward the ctx from src/server.ts via `opts.context` once that handler does.
  return app.fetch(request, env)
}

export default buildApp
