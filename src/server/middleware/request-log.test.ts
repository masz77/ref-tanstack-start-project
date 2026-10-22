import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { emitRequestLog, shouldLogRequest } from '@/server/middleware/request-log'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('emitRequestLog', () => {
  it('writes exactly one line with only the allowed keys', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    emitRequestLog({
      method: 'GET',
      path: '/template',
      status: 200,
      durationMs: 4,
      requestId: 'ray-1',
    })

    expect(log).toHaveBeenCalledTimes(1)
    const entry = JSON.parse(String(log.mock.calls[0][0]))
    expect(Object.keys(entry).sort()).toEqual(
      ['durationMs', 'method', 'path', 'requestId', 'status', 'type'].sort(),
    )
    expect(entry.type).toBe('request')
  })

  it('skips health, doc, reference, options and static assets', () => {
    expect(shouldLogRequest('GET', '/api/health')).toBe(false)
    expect(shouldLogRequest('GET', '/api/doc')).toBe(false)
    expect(shouldLogRequest('GET', '/api/reference')).toBe(false)
    expect(shouldLogRequest('OPTIONS', '/api/session')).toBe(false)
    expect(shouldLogRequest('GET', '/assets/index-abc.js')).toBe(false)
    expect(shouldLogRequest('GET', '/template')).toBe(true)
  })
})
