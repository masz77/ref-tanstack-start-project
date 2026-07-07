# Response Caching

## Overview

Response caching is driven by **standard HTTP `Cache-Control` headers**, not any
CDN-specific API — because this is a white-label template that must run behind *any*
host or CDN, not only Cloudflare. A single central policy module per app stamps the
headers; Cloudflare's [Workers Cache](https://blog.cloudflare.com/workers-cache/) (GA)
is the Cloudflare-native accelerator, enabled with `"cache": { "enabled": true }` in
each `wrangler.jsonc`. Workers Cache honors `Cache-Control` per
[RFC 9111](https://developers.cloudflare.com/workers/cache/) with **zero CF-specific
code** — on a non-CF host that wrangler block is simply never read, and the same headers
still work behind whatever CDN sits in front. Caching is **on by default** and opted out
by flipping one in-code constant per app. The single most important invariant: only
**visitor-independent** responses are ever shared-cached — everything else defaults to
`private, no-store`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Core mechanism | **HTTP `Cache-Control` response headers** — not a CDN-specific cache API | Portable. This is a white-label template; headers work behind any CDN. Cloudflare Workers Cache honors them per RFC 9111 with no CF-only code, and the wrangler `cache` block is just ignored off-CF. |
| Cloudflare accelerator | `"cache": { "enabled": true }` (top-level) in **each** `wrangler.jsonc` | Turns on Workers Cache (GA). It reads the standard headers we already emit — no code coupling. Removing/flipping it disables only the CF edge layer; headers still apply behind any other CDN. |
| Global toggle | In-code constant `CACHE_ENABLED = true` in each app's central policy module | User choice: explicit and greppable over an env var — no runtime config to inspect, opt out by flipping one line. Mirrors the optional-KV-binding spirit. |
| Backend route policy | **Allowlist + `private, no-store` default** (not a denylist) | Safety with zero maintenance: only `/`, `/doc`, `/reference` are public-cached; every other route (including `/api/auth/*`, `/api/session`, `/health`, `/test`, and all future routes) is non-cacheable automatically. No denylist to keep in sync. |
| Frontend page policy | **Per-route `headers`** opt-in (not a root-level default) | Only 3 public pages (`/`, `/login`, `/signup`) are cacheable. A root default would wrongly apply one policy to every page; per-route means new routes are uncached until explicitly opted in — a safe default. |
| Frontend HTML policy | `public, max-age=0, s-maxage=600` on public HTML | Browser always revalidates (`max-age=0`); the edge absorbs SSR load for 10 min (`s-maxage`). |
| No `stale-while-revalidate` on HTML | SWR **omitted** from the HTML policy (kept on backend JSON) | Chrome 75+/Firefox 68+ honor SWR in the browser's *own* private cache, so SWR on `max-age=0` HTML would serve day-old pages instantly — the earlier "no stale HTML after deploy" claim was wrong. Worse, Cloudflare Workers static assets serve only the *current* deployment's manifest, so stale HTML references content-hashed JS/CSS that **404s** after a deploy; the short `s-maxage` caps that dead-asset window at 10 min. |
| Cache purging | **Ready-to-call**, not wired: `purgeCacheTags(tags)` helper + `Cache-Tag` stamping ship, but no production code path invokes purging yet | User opted in to the capability. The helper calls Cloudflare's purge API but **no-ops off-Cloudflare** (guarded dynamic import — a static import would crash other runtimes); off-CF it warns once and returns `{ success: false }`. |
| Compatibility date | **Not** bumped — kept at backend `2025-10-08`, frontend `2025-09-27` | Cloudflare docs set no minimum `compatibility_date` for Workers Cache; the real precondition is **Wrangler ≥ 4.69.0**. |

## Key Files

| File | Purpose |
|------|---------|
| `apps/backend/src/lib/cache-control.ts` | Backend central policy: the `CACHE_ENABLED` toggle, the one route→policy allowlist map, and the Hono middleware that stamps `Cache-Control` (+ `Cache-Tag`) only on the cacheable branch — GET/HEAD, 2xx, allowlisted path, no `Origin` header; every other response gets `private, no-store`. |
| `apps/backend/src/lib/cache.ts` | The guarded `purgeCacheTags(tags)` purge helper — calls Cloudflare's purge API, no-ops off-CF via a guarded dynamic import (warns once, returns `{ success: false }`). |
| `apps/backend/src/infrastructure/cache/` | **Unrelated to this feature**: an unwired KV-backed `CacheService` (data cache). Not part of response caching — do not confuse the two. |
| `apps/backend/src/lib/create-app.ts` | Registers the cache-control middleware once, so every route is covered by the allowlist-or-`no-store` default. |
| `apps/backend/wrangler.jsonc` | `"cache": { "enabled": true }` (Workers Cache) + `compatibility_date: 2025-10-08`. |
| `apps/frontend/src/lib/cache-policy.ts` | Frontend central policy: the `CACHE_ENABLED` toggle + the public-page→`Cache-Control` map (`/`, `/login`, `/signup`); `cacheHeaders(ctx)` reads the matched route's own `fullPath` and returns nothing for error/not-found matches. |
| `apps/frontend/src/routes/*` | Each cached public page wires its policy with `headers: cacheHeaders` (no argument — the fn reads the matched route). |
| `apps/frontend/wrangler.jsonc` | `"cache": { "enabled": true }` + `compatibility_date: 2025-09-27`. |
| `apps/frontend/src/routes/__root.tsx` | **Invariant holder**: does no SSR session fetch (auth hydrates client-side), which is what makes public-page HTML visitor-independent and therefore shared-cacheable. |

## Data Flow

```
request
  → (on Cloudflare) Workers Cache edge lookup
       HIT  → response served from edge; Worker never runs, no CPU billed
       MISS ↓
  → Worker runs
       backend: cache-control middleware stamps public Cache-Control + Cache-Tag ONLY when
                ALL hold — else it stamps private,no-store:
                  • method is GET or HEAD        (OPTIONS preflight 204s were stampable before)
                  • status is 2xx                (never cache a 429/500 error)
                  • path is in the allowlist      (allowlist membership, NOT tag-truthiness)
                  • request has NO `Origin` header (CORS × cache guard — see below)
       frontend: route's `headers` option merges its Cache-Control (parent→child, child wins),
                 committed before streaming begins; cacheHeaders emits nothing for an
                 error/not-found match, so error pages are never shared-cached
  → response returned and cached per its headers (edge + browser)
```

Notes:
- **Smart placement composes with the cache.** The backend runs `placement.mode: "smart"`;
  the edge cache is checked **before** placement routing, so a cache hit never triggers a
  placement round-trip.
- **Workers Cache auto-bypass**: responses carrying `Set-Cookie` and requests carrying
  `Authorization` are never shared-cached, independent of our headers — a second safety net
  under the allowlist.
- **Backend TTLs** (allowlisted `/`, `/doc`, `/reference`):
  `public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`.
- **Frontend TTLs** (`/`, `/login`, `/signup`): `public, max-age=0, s-maxage=600` — browser
  always revalidates; edge absorbs SSR load 10 min. No `stale-while-revalidate` on HTML (it
  would serve stale HTML from the browser's own cache and reference 404'd hashed assets after
  a deploy — see the decision table).

## Security Considerations

- **Allowlist, not denylist** — the default for every backend route is `private, no-store`
  (in `cache-control.ts`). Auth and session responses (`/api/auth/*`, `/api/session`) are
  non-cacheable **by default**, so they can never be shared-cached even as new routes are
  added.
- **No shared cache of visitor-specific data** — only visitor-independent responses are
  public-cached. Workers Cache additionally auto-bypasses `Set-Cookie` responses and
  `Authorization` requests, so an authenticated response can't leak into a shared cache
  even if mis-allowlisted.
- **SSR HTML cacheability is an invariant** — `__root.tsx` does no SSR session fetch (auth
  hydrates client-side), so public-page HTML is identical for every visitor. **Any route
  that adds a personalized SSR loader MUST NOT be added to the cache policy map** — doing so
  would shared-cache one visitor's rendered data for others. Treat this as a STOP condition.
- **CORS × cache guard** — the cacheable branch requires **no `Origin` request header**. A
  credentialed CORS response carries a per-origin `Access-Control-Allow-Origin`; a shared cache
  that ignores `Vary: Origin` could replay one origin's response to another. Workers Cache does
  honor `Vary`, but the no-`Origin` gate is the portable-safe default — cross-origin RPC reads
  simply bypass the shared cache rather than depend on every CDN respecting `Vary`.
- **Error pages are never shared-cached** — both the backend 2xx gate and the frontend
  `cacheHeaders` error/not-found check drop out to `no-store`, so a 429/500/404 can't be pinned
  in a shared cache for the whole `s-maxage` window.
- **Cache HITs skip the Worker → they skip observability** — on Cloudflare with the cache on, an
  edge HIT never runs the Worker, so **request logging (Workers Logs) and the rate limiter never
  see those requests**. For cached paths, read edge/cache analytics, not the Worker logs, to see
  true traffic. (Only `/`, `/doc`, `/reference` and the 3 public FE pages are affected.)
- **Purge stays portable and scoped** — `purgeCacheTags(tags)`'s Cloudflare dependency is a
  *guarded dynamic import*, so it no-ops off-CF instead of crashing the runtime. `Cache-Tag`
  values must be printable ASCII, ≤1024 chars/tag, ≤1000 tags/response; purges are scoped to
  the calling Worker/entrypoint (a Worker can't purge another's cache).

## Usage

**1. Disable / enable caching globally (per app).**
Flip `CACHE_ENABLED` in `apps/backend/src/lib/cache-control.ts` or
`apps/frontend/src/lib/cache-policy.ts`. `false` → the module stamps nothing (backend falls
to origin defaults; frontend routes emit no `Cache-Control`).

**2. Add a cached backend route.**
Add one entry to the `POLICY` map in `cache-control.ts` — values are objects, not plain strings:
`'/my-route': { cacheControl: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400', cacheTag: 'static,my-route' }`.
No other change — the middleware already runs on every route.

**3. Add a cached frontend page.**
Add the page's path to the `POLICY` map in `cache-policy.ts`, then wire `cacheHeaders` as the
route's `headers` option — **pass it directly, no call**; it reads the matched route's own path
from context:
`export const Route = createFileRoute('/my-page')({ component: MyPage, headers: cacheHeaders })`
(see `apps/frontend/src/routes/index.tsx:5`). Omit both and the page stays uncached (the safe default) — as `/template` and `/health-demo` do.

**4. Tune TTLs.**
Edit the directive strings in the maps. Directives:
- `max-age=N` — seconds a **browser** may reuse without revalidating (`0` = always revalidate).
- `s-maxage=N` — seconds a **shared/edge cache** may reuse (overrides `max-age` for CDNs).
- `stale-while-revalidate=N` — seconds a cache may serve **stale** while revalidating in the background.
- `public` — shared caches may store it; `private, no-store` — never cache.

**5. Purge by tag (Cloudflare only).**
Call `purgeCacheTags(tags)` (exported from `cache.ts`) with the tag(s) to invalidate. It's
ready-to-call but **not invoked anywhere yet** — wire it into whatever mutation should bust the
cache. It no-ops off-Cloudflare (warns once, returns `{ success: false }`), so callers need no
host check.

**6. Disable the Cloudflare layer only vs. disable headers entirely.**
Remove or set `"cache": { "enabled": false }` in a `wrangler.jsonc` to drop only the CF edge
cache — the `Cache-Control` headers still apply behind any other CDN. To stop emitting headers
altogether, set `CACHE_ENABLED = false` (step 1).
