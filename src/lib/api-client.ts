import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeader, getRequestUrl } from '@tanstack/react-start/server'
import { hc } from 'hono/client'
// 2026-10-22: @repo/backend workspace package is gone (single package now); the type
// comes from the in-repo Hono app instead.
// why: import from '@/server/app', not '@/server' — P6 adds src/server.ts, and a file
// would win over the directory index.
import type { AppType } from '@/server/app'

// 2026-10-22: The API is served by the same Worker as the pages, so the client
// always calls its own origin: the browser uses window.location.origin, SSR uses
// the origin of the incoming request. The old backend-URL env var is gone.
// shortcut: SSR calls its own origin over the network, replaced by server functions in P3/P4
const getOrigin = createIsomorphicFn()
  .client((): string => window.location.origin)
  .server((): string => {
    try {
      return getRequestUrl().origin
    } catch {
      // No SSR request context (build, background task) → fall through.
      return ''
    }
  })

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
// trusted origin. Resolve the outbound URL (relative to the API origin)
// and compare its origin against the API origin's. Returns false on any parse
// failure so a malformed URL never leaks the cookie.
// 2026-10-22: the trusted origin is the app's own origin (same Worker), not a
// separate backend host.
function isSameOrigin(input: RequestInfo | URL, origin: string): boolean {
  const requestUrl =
    input instanceof Request ? input.url : input instanceof URL ? input.href : input
  try {
    return new URL(requestUrl, origin).origin === new URL(origin).origin
  } catch {
    return false
  }
}

/**
 * Creates a typed Hono RPC client.
 * Use inside components or server functions — NOT at module level.
 */
// 2026-05-29: Wire `credentials: 'include'` so the browser attaches the
// better-auth session cookie on same-origin calls.
// Without this the cookie is dropped and every authenticated RPC 401s.
// 2026-10-22: the API moved into this same Worker, so the base URL is the
// app's own origin.
export function createApiClient(accessToken?: string) {
  const origin = getOrigin()

  return hc<AppType>(origin, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof window === 'undefined') {
        const cookie = readSSRCookie()
        // Only attach the cookie when the request targets our own origin —
        // never to any other host, even if `input` were misconfigured
        // (see isSameOrigin's security-boundary note).
        if (cookie && isSameOrigin(input, origin)) {
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
