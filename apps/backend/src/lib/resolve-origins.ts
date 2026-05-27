/**
 * Common local-dev origins used when `CORS_ORIGINS` is not configured, so a
 * plain `bun run dev` works without setting the binding.
 */
export const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8787",
];

/**
 * Parses the `CORS_ORIGINS` binding into a list of origin strings.
 *
 * Accepts either an array (wrangler vars array form) or a comma-separated
 * string; falls back to {@link DEFAULT_DEV_ORIGINS} when unset.
 *
 * 2026-05-27: extracted from create-app.ts so better-auth's `trustedOrigins`
 * (auth/index.ts) and the Hono CORS middleware resolve origins from the SAME
 * source. Previously trustedOrigins was hardcoded to localhost, so a prod FE
 * request that passed CORS was still rejected by better-auth with
 * INVALID_ORIGIN. These two lists MUST agree: CORS decides whether the browser
 * sends the request, trustedOrigins decides whether better-auth accepts it for
 * state-changing auth calls (CSRF boundary). Kept in its own module (no auth
 * imports) to avoid the create-app ↔ auth circular import.
 */
export function resolveCorsOrigins(env: Record<string, unknown> | undefined): string[] {
  const rawOrigins = (env as { CORS_ORIGINS?: unknown })?.CORS_ORIGINS;

  if (Array.isArray(rawOrigins)) {
    return rawOrigins.map((origin) => String(origin));
  }

  if (typeof rawOrigins === "string") {
    return rawOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [...DEFAULT_DEV_ORIGINS];
}
