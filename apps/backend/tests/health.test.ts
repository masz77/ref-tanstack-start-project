import { describe, expect, it } from 'vitest'
import { createTestApp } from '../src/lib/create-app'
import indexRouter from '../src/routes/index.route'

describe('GET /health', () => {
  const app = createTestApp(indexRouter)

  it('returns 200', async () => {
    const res = await app.request('/health')
    expect(res.status).toBe(200)
  })

  it('returns expected JSON shape', async () => {
    const res = await app.request('/health')
    const body = await res.json() as Record<string, unknown>
    expect(body.status).toBe('healthy')
    expect(typeof body.timestamp).toBe('string')
    expect(typeof body.uptime).toBe('number')
    expect(typeof body.version).toBe('string')
  })

  it('timestamp is a valid ISO date string', async () => {
    const res = await app.request('/health')
    const body = await res.json() as Record<string, unknown>
    const ts = body.timestamp as string
    expect(new Date(ts).toISOString()).toBe(ts)
  })
})
