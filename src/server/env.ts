import type { KVNamespace, Queue } from '@cloudflare/workers-types'
import type { AnyD1Database } from 'drizzle-orm/d1'
import type { AuthInstance } from '@/server/auth'
import type { AppEmitter } from '@/server/infrastructure/events/types'
import type { AuthenticatedUser } from '@/server/middleware/auth'

export type AppEnv = {
  Bindings: {
    data_151f7d9b365f41d783ed0bf4eeef5086?: AnyD1Database
    // 2026-05-29: `DB` is the real wrangler.jsonc binding name; `DATABASE` is
    // kept as a backward-compat alias for older callers. Auth factory prefers
    // DB and falls back to DATABASE / data_<hash>.
    DB?: AnyD1Database
    DATABASE?: AnyD1Database
    KV?: KVNamespace
    EVENTS_QUEUE?: Queue<unknown>
    // why: Cloudflare Rate Limiting binding; only present once the ratelimits block in wrangler.jsonc is enabled.
    RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
    BETTER_AUTH_SECRET?: string
    BETTER_AUTH_URL?: string
    // 2026-05-29: Google OAuth client credentials. Set via `.dev.vars` locally
    // and `wrangler secret put` for prod. Authorized redirect URI in Google
    // Cloud Console must be `<BETTER_AUTH_URL>/api/auth/callback/google`.
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    STRIPE_SECRET_KEY?: string
    ASSETS?: { fetch: (request: Request) => Promise<Response> }
  }
  Variables: {
    auth: AuthInstance
    user?: AuthenticatedUser
    session?: unknown
    validatedBody?: unknown
    validatedQuery?: unknown
    validatedParams?: unknown
    uploadedFile?: File
    emitter: AppEmitter
  }
}
