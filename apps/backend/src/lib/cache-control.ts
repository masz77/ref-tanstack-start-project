import type { MiddlewareHandler } from "hono";

// why: in-code toggle, not an env var — white-label template keeps a portable
// Cache-Control core that works behind any CDN; the CF Workers Cache layer is
// optional and opted out by flipping this one line (see response-caching.md).
export const CACHE_ENABLED = true;

export const CACHEABLE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
export const NO_STORE = "private, no-store";

// Allowlist: path → Cache-Tag. Membership means "shared-cacheable"; every entry
// uses the one CACHEABLE directive. Only visitor-independent responses belong here.
// why: no-store default (not a denylist) — auth/session and all future routes are
// non-cacheable unless explicitly added here.
const CACHE_TAGS: Record<string, string> = {
  "/": "static,api-index",
  "/doc": "static,openapi",
  "/reference": "static,reference",
};

// `enabled` defaults to the CACHE_ENABLED constant; the param exists only so the
// disabled path is unit-testable without mutating a module const.
export function cacheControlMiddleware(enabled: boolean = CACHE_ENABLED): MiddlewareHandler {
  return async (c, next) => {
    await next();
    if (!enabled) {
      return;
    }

    const tag = CACHE_TAGS[c.req.path];
    const method = c.req.method;
    // why: only a GET/HEAD, no request Origin, allowlisted path, 2xx may be shared-cached.
    // - non-GET (incl. CORS OPTIONS 204) and non-2xx (429/500) must never carry a public
    //   directive — portable CDNs honor Cache-Control literally and would cache a preflight/error.
    // - an Origin request gets credentialed Access-Control-Allow-Origin baked in; a Vary-ignoring
    //   CDN would then serve origin A's ACAO to origin B. On CF, Vary:Origin handles it; requiring
    //   no Origin is the portable-safe default — cross-origin RPC reads just skip the shared cache.
    const cacheable =
      tag !== undefined &&
      (method === "GET" || method === "HEAD") &&
      !c.req.header("origin") &&
      c.res.status >= 200 &&
      c.res.status < 300;

    if (cacheable) {
      c.res.headers.set("Cache-Control", CACHEABLE);
      if (tag) {
        c.res.headers.set("Cache-Tag", tag);
      }
    } else {
      c.res.headers.set("Cache-Control", NO_STORE);
    }
  };
}
