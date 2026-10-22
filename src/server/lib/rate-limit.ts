import type { AppEnv } from '@/server/env'

// why: off until the Cloudflare Rate Limiting binding is declared in wrangler.jsonc; opt in by uncommenting that block and flipping this line.
export const RATE_LIMIT_ENABLED = false

export const RATE_LIMITED_MESSAGE = 'rate-limited: Too many requests. Try again in a minute.'

export type RateLimitBinding = NonNullable<AppEnv['Bindings']['RATE_LIMITER']>

export function clientKey(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'unknown'
}

// why: fails open when the binding is missing, so a wrangler config without the ratelimits block never blocks traffic.
export async function checkRateLimit(
  key: string,
  binding: RateLimitBinding | undefined,
  enabled: boolean = RATE_LIMIT_ENABLED,
): Promise<{ limited: boolean }> {
  if (!enabled || !binding) {
    return { limited: false }
  }

  const { success } = await binding.limit({ key })
  return { limited: !success }
}
