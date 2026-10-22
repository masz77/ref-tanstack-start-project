import { describe, expect, it, vi } from 'vite-plus/test'
import { forwardToApi } from '@/server/app'

// why: the Workers `env` binding is only available inside the runtime; an empty object is enough for the limiter path.
vi.mock('cloudflare:workers', () => ({ env: {} }))

describe('forwardToApi (module-scope app)', () => {
  it('counts rate-limit hits across requests on the same app instance', async () => {
    const headers = { 'cf-connecting-ip': '1.2.3.4' }

    const first = await forwardToApi(new Request('http://localhost/api/health', { headers }))
    const second = await forwardToApi(new Request('http://localhost/api/health', { headers }))

    // hono-rate-limiter draft-6 default: RateLimit-Remaining (node_modules/hono-rate-limiter/dist/index.js:17)
    const firstRemaining = Number(first.headers.get('RateLimit-Remaining'))
    const secondRemaining = Number(second.headers.get('RateLimit-Remaining'))

    expect(secondRemaining).toBe(firstRemaining - 1)
  })
})
