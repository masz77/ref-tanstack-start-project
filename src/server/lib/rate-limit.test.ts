import { describe, expect, it, vi } from 'vite-plus/test'
import { checkRateLimit, type RateLimitBinding } from '@/server/lib/rate-limit'

function binding(success: boolean) {
  const limit = vi.fn(async () => ({ success }))
  return { binding: { limit } satisfies RateLimitBinding, limit }
}

describe('checkRateLimit', () => {
  it('never calls the binding when disabled', async () => {
    const { binding: b, limit } = binding(false)

    expect(await checkRateLimit('1.2.3.4', b, false)).toEqual({ limited: false })
    expect(limit).not.toHaveBeenCalled()
  })

  it('limits when enabled and the binding rejects the key', async () => {
    const { binding: b, limit } = binding(false)

    expect(await checkRateLimit('1.2.3.4', b, true)).toEqual({ limited: true })
    expect(limit).toHaveBeenCalledWith({ key: '1.2.3.4' })
  })

  it('does not limit when enabled but the binding is missing', async () => {
    expect(await checkRateLimit('1.2.3.4', undefined, true)).toEqual({ limited: false })
  })
})
