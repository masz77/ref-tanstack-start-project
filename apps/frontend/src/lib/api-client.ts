import type { AppType } from '@repo/backend'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { hc } from 'hono/client'

// 2026-05-29: Strip trailing slash(es). A trailing slash in VITE_BACKEND_URL
// (e.g. "https://your-api.workers.dev/") makes the Hono RPC client build
// "//api/session", which the deployed Worker router 404s on.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8787').replace(
  /\/+$/,
  '',
)

// 2026-05-29: Forward the incoming Cookie header on SSR. TanStack Start runs
// route `loader` / `beforeLoad` server-side during a hard refresh; server-side
// `fetch` runs in the SSR worker, not the browser, so `credentials:'include'`
// is a no-op and the better-auth cookie never reaches /api/session. We pull
// the inbound request's Cookie header via TanStack Start's `getRequestHeader`
// and attach it to outbound RPC calls.
//
// `createIsomorphicFn` is the framework's blessed escape hatch: the start
// compiler rewrites the expression to just the client variant on client
// builds, then dead-code elimination removes the `getRequestHeader` import
// before TanStack Start's import-protection plugin sees the module — so both
// env-specific code paths and their imports cleanly disappear from each bundle.
const readSSRCookie = createIsomorphicFn()
  .client((): string | undefined => undefined)
  .server((): string | undefined => {
    try {
      return getRequestHeader('cookie')
    } catch {
      // No SSR request context (test, build, background) → fall through.
      return undefined
    }
  })

// 2026-05-29: Security boundary — only forward the session cookie to the
// trusted backend origin. Resolve the outbound URL (relative to BACKEND_URL)
// and compare its origin against BACKEND_URL's. Returns false on any parse
// failure so a malformed URL never leaks the cookie.
function isBackendOrigin(input: RequestInfo | URL): boolean {
  const requestUrl =
    input instanceof Request ? input.url : input instanceof URL ? input.href : input
  try {
    return new URL(requestUrl, BACKEND_URL).origin === new URL(BACKEND_URL).origin
  } catch {
    return false
  }
}

/**
 * Creates a typed Hono RPC client.
 * Use inside components or server functions — NOT at module level.
 */
// 2026-05-29: Wire `credentials: 'include'` so the browser attaches the
// better-auth session cookie on cross-origin calls (FE :3000 → BE :8787).
// Without this the cookie is dropped and every authenticated RPC 401s.
// Backend CORS already reflects the origin and sets
// `Access-Control-Allow-Credentials: true` (see create-app.ts).
export function createApiClient(accessToken?: string) {
  return hc<AppType>(BACKEND_URL, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof window === 'undefined') {
        const cookie = readSSRCookie()
        // Only attach the cookie when the request targets the trusted backend
        // origin — never to any other host, even if `input` or the env were
        // misconfigured (see isBackendOrigin's security-boundary note).
        if (cookie && isBackendOrigin(input)) {
          const headers = new Headers(init?.headers)
          if (!headers.has('cookie')) headers.set('cookie', cookie)
          return fetch(input, { ...init, headers })
        }
        return fetch(input, init)
      }
      return fetch(input, { ...init, credentials: 'include' })
    },
  })
}

export type ApiClient = ReturnType<typeof createApiClient>

// 2026-05-29: Typed API error so callers can branch on status code — e.g.
// `queries/session.ts` maps 401 → null ("logged out").
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
