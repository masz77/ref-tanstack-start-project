import { passkey } from '@better-auth/passkey'
import type {
  D1Database,
  IncomingRequestCfProperties,
  KVNamespace,
} from '@cloudflare/workers-types'
import { betterAuth } from 'better-auth'
import { withCloudflare } from 'better-auth-cloudflare'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { anonymous, openAPI } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import { type Env as DatabaseEnv, resolveD1Binding } from '@/server/infrastructure/db'
import * as schema from '@/server/infrastructure/db/schema'
import { isProductionEnvironment } from '@/server/lib/cookie-utils'

/**
 * Cloudflare Workers environment bindings for authentication.
 * Includes D1 database for user data and KV namespace for session storage.
 */
export type CloudflareAuthEnv = DatabaseEnv & {
  /** D1 database binding (real wrangler.jsonc binding name) */
  DB?: D1Database
  /** Legacy D1 alias kept for backward compat with older callers */
  DATABASE?: D1Database
  /** KV namespace binding for session management and caching */
  KV?: KVNamespace
  /** Public app URL, same origin as the UI (e.g. https://app.example.com) */
  BETTER_AUTH_URL?: string
  /** Secret key used for signing tokens and sessions */
  BETTER_AUTH_SECRET?: string
  /** Google OAuth client credentials (set via .dev.vars or wrangler secret) */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
}

/**
 * Creates and configures a Better Auth instance for Cloudflare Workers.
 *
 * Initializes Better Auth with Cloudflare-specific adapters and plugins:
 * - D1 database adapter via Drizzle ORM for user data persistence
 * - KV namespace for session storage and caching
 * - Email/password authentication with verification support
 * - Anonymous user sessions
 * - OpenAPI documentation integration
 * - Rate limiting with geolocation tracking
 * - Automatic IP address detection
 *
 * @param env - Cloudflare Workers environment bindings containing D1 DATABASE and KV namespace
 * @param cf - Cloudflare request properties for geolocation and IP tracking
 * @returns Configured Better Auth instance with Cloudflare adapters and enabled plugins
 */
export function createAuth(env?: CloudflareAuthEnv, cf?: IncomingRequestCfProperties) {
  const d1Binding = env && resolveD1Binding(env)

  const db =
    env && d1Binding
      ? drizzle(d1Binding, {
          schema,
          logger: true,
        })
      : ({} as any)

  return betterAuth({
    // 2026-10-22: trustedOrigins removed; the app is same-origin, so better-auth trusts only this origin.
    // why: the baseURL origin is the CSRF boundary (node_modules/better-auth/dist/context/helpers.mjs:72-73).
    baseURL: env?.BETTER_AUTH_URL || 'http://localhost:5173',
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf: cf || {},
        d1:
          env && d1Binding
            ? {
                db,
                options: {
                  usePlural: false,
                  debugLogs: !isProductionEnvironment(),
                },
              }
            : undefined,
        kv: env?.KV,
      },
      {
        emailAndPassword: {
          enabled: true,
        },
        // 2026-05-29: Google OAuth. Account rows land in the existing `account`
        // table. Redirect URI configured in Google Cloud Console must be
        // `<BETTER_AUTH_URL>/api/auth/callback/google`. If env vars are absent
        // (e.g. fresh checkout, no .dev.vars yet) we omit the provider entirely
        // — better-auth would otherwise crash on init.
        socialProviders:
          env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET
            ? {
                google: {
                  clientId: env.GOOGLE_CLIENT_ID,
                  clientSecret: env.GOOGLE_CLIENT_SECRET,
                },
              }
            : undefined,
        // 2026-05-29: Sign the session into the cookie itself so cache hits do
        // ZERO D1 round-trips. better-auth refetches every `maxAge` seconds (or
        // on sign-out). Trade-off: up to 5min stale window — a revoked session
        // keeps access until cookie refresh. Shorten if your security model
        // needs it tighter.
        session: {
          cookieCache: {
            enabled: true,
            maxAge: 5 * 60,
          },
        },
        plugins: [anonymous(), openAPI(), passkey()],
        rateLimit: {
          enabled: false,
        },
        advanced: {
          // 2026-10-22: SameSite=None and the forced Secure flag were removed; cookies use better-auth's defaults (SameSite=Lax).
          // why: same-origin app, so Lax is enough; `__Secure-` prefix and Secure follow https, since browsers reject Secure cookies over http.
          useSecureCookies: (env?.BETTER_AUTH_URL ?? '').startsWith('https://'),
        },
      },
    ),
    ...(env && d1Binding
      ? {}
      : {
          database: drizzleAdapter({} as D1Database, {
            provider: 'sqlite',
            usePlural: false,
            debugLogs: !isProductionEnvironment(),
          }),
        }),
  })
}

/**
 * Builds the per-request auth instance (the Workers `env` bindings plus the request's `cf` data).
 */
export function createAuthForRequest(env: CloudflareAuthEnv, request: Request) {
  return createAuth(env, (request as Request & { cf?: IncomingRequestCfProperties }).cf)
}

/**
 * Type representing a configured Better Auth instance for Cloudflare Workers.
 * Includes all authentication methods, session management, and plugin APIs.
 */
export type AuthInstance = ReturnType<typeof createAuth>

/**
 * Default authentication instance for the application.
 * Pre-configured singleton that can be used across the application.
 */
export const auth = createAuth()
