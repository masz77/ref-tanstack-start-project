// Frontend response-cache policy. See docs/ARCHITECTURE/response-caching.md.
// Central place that decides which public SSR pages get a shared-cacheable
// Cache-Control header. Flip CACHE_ENABLED to opt the whole app out.

export const CACHE_ENABLED = true

// why: max-age=0 → the browser always revalidates; s-maxage=600 lets the edge
// absorb SSR load for 10 min. SWR is deliberately omitted on HTML: browsers
// honor SWR in their own cache too, so it would serve day-old HTML for the whole
// window, and after a deploy that stale HTML references content-hashed JS/CSS
// that 404s (Workers serves only the current deployment's asset manifest) — the
// short s-maxage caps that dead-asset window at 10 min.
const PUBLIC_HTML = 'public, max-age=0, s-maxage=600'

// why: invariant — only session-independent SSR pages may be listed here. Auth
// hydrates client-side (see routes/__root.tsx), so this HTML is identical for
// every visitor and safe to share-cache. A route that adds a personalized SSR
// loader must NEVER be added here — it would leak one visitor's render to others.
const POLICY: Record<string, string> = {
  '/': PUBLIC_HTML,
  '/login': PUBLIC_HTML,
  '/signup': PUBLIC_HTML,
}

type HeadersFnContext = {
  match: { fullPath: string }
  matches: ReadonlyArray<{ status: string; globalNotFound?: boolean }>
}

// Used directly as a route's `headers` option (`headers: cacheHeaders`). Reads
// the matched route's own path, so a route can't opt in under a stale hardcoded
// string. Emits nothing (no Cache-Control) unless caching is on AND the path is
// an allowlisted public page — the safe, uncached default.
export function cacheHeaders(ctx: HeadersFnContext): Record<string, string> | undefined {
  if (!CACHE_ENABLED) return undefined
  // why: non-OK SSR (500 error page / not-found) must never be shared-cached —
  // otherwise a shared cache could serve an outage for the whole s-maxage window.
  // Mirrors the backend's 2xx-only cache gate. One guard here covers every route.
  if (ctx.matches.some((m) => m.status === 'error' || m.globalNotFound)) return undefined
  const value = POLICY[ctx.match.fullPath]
  return value ? { 'cache-control': value } : undefined
}
