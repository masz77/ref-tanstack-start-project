import authRouter from '@/server/features/auth/routes'
import index from '@/server/features/health/routes'
import configureOpenAPI from '@/server/lib/configure-open-api'
import createApp from '@/server/lib/create-app'

export function buildApp() {
  // why: one Worker serves both the pages and the API, so the Hono app is mounted
  // under /api and the browser calls its own origin (no CORS, no second deployment).
  const app = createApp().basePath('/api')

  configureOpenAPI(app)

  const routes = app.route('/', authRouter).route('/', index)

  return routes
}

export type AppType = ReturnType<typeof buildApp>

// why: the app is built ONCE per isolate. Rebuilding it per request would create a
// fresh CloudflareRateLimitStore on every call (the 100-request limit would never
// trip) and would rebuild the whole OpenAPI tree + event emitter per request.
export const app = buildApp()

// why: the Workers runtime exposes the bindings (D1, KV, ...) through
// `cloudflare:workers`, not through the request. Imported lazily so this module
// stays loadable outside the Workers runtime (vitest, scripts).
export async function forwardToApi(request: Request): Promise<Response> {
  const { env } = await import('cloudflare:workers')

  // shortcut: no ExecutionContext is passed, so `c.executionCtx` throws; pass ctx
  // once the custom Worker entry (P6) exists.
  return app.fetch(request, env)
}

export default buildApp
