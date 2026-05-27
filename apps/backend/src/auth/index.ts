import type { D1Database, IncomingRequestCfProperties, KVNamespace } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, openAPI } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";

import type { Env as DatabaseEnv } from "@/infrastructure/db";
import * as schema from "@/infrastructure/db/schema";
import { isProductionEnvironment } from "@/lib/cookie-utils";
import { resolveCorsOrigins } from "@/lib/resolve-origins";

/**
 * Cloudflare Workers environment bindings for authentication.
 * Includes D1 database for user data and KV namespace for session storage.
 */
export type CloudflareAuthEnv = DatabaseEnv & {
  /** D1 database binding for authentication data storage */
  DATABASE?: D1Database;
  /** KV namespace binding for session management and caching */
  KV?: KVNamespace;
  /** Base URL for Better Auth (e.g. https://api.example.com) */
  BETTER_AUTH_URL?: string;
  /** Secret key used for signing tokens and sessions */
  BETTER_AUTH_SECRET?: string;
  /**
   * Allowed origins for CORS — array or comma-separated string. Also drives
   * better-auth's `trustedOrigins` so the two layers stay in sync.
   */
  CORS_ORIGINS?: string | string[];
};

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
  const d1Binding = env?.DATABASE ?? env?.data_151f7d9b365f41d783ed0bf4eeef5086;

  const db =
    env && d1Binding
      ? drizzle(d1Binding, {
          schema,
          logger: true,
        })
      : ({} as any);

  return betterAuth({
    baseURL: env?.BETTER_AUTH_URL || "http://localhost:8787",
    // 2026-05-27: trustedOrigins now derives from CORS_ORIGINS (same source as
    // the Hono CORS middleware) instead of a hardcoded localhost list. The
    // hardcoded list rejected the prod FE origin with INVALID_ORIGIN even
    // though it passed CORS — the two layers must agree. Falls back to local
    // dev origins when CORS_ORIGINS is unset. This is the CSRF boundary, so
    // CORS_ORIGINS in prod must list ONLY trusted FE domains, never "*".
    trustedOrigins: resolveCorsOrigins(env),
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
        plugins: [anonymous(), openAPI()],
        rateLimit: {
          enabled: false,
        },
      },
    ),
    ...(env && d1Binding
      ? {}
      : {
          database: drizzleAdapter({} as D1Database, {
            provider: "sqlite",
            usePlural: false,
            debugLogs: !isProductionEnvironment(),
          }),
        }),
  });
}

/**
 * Type representing a configured Better Auth instance for Cloudflare Workers.
 * Includes all authentication methods, session management, and plugin APIs.
 */
export type AuthInstance = ReturnType<typeof createAuth>;

/**
 * Default authentication instance for the application.
 * Pre-configured singleton that can be used across the application.
 */
export const auth = createAuth();
