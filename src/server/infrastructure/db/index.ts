import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1'
import type { AppEnv } from '@/server/env'
import * as schema from './schema'

export type Env = Pick<
  AppEnv['Bindings'],
  'data_151f7d9b365f41d783ed0bf4eeef5086' | 'DB' | 'DATABASE' | 'KV' | 'EVENTS_QUEUE'
>

type DatabaseInstance = DrizzleD1Database<typeof schema>

// 2026-10-22: Prefer env.DB (the wrangler.jsonc binding name); it was missing, so every db() call threw.
// why: same precedence as createAuth (src/server/auth/index.ts:59-61); DATABASE and data_<hash> stay as fallbacks.
export function createDb(env: Env): DatabaseInstance {
  const binding = env.DB ?? env.DATABASE ?? env.data_151f7d9b365f41d783ed0bf4eeef5086
  if (!binding) {
    throw new Error('D1 database binding is not configured.')
  }
  return drizzle(binding, { schema })
}

export type { DatabaseInstance as CloudflareD1Database }
export default createDb
