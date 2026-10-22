import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { GENERIC_SERVER_FN_ERROR, sanitizeServerFnError } from '@/server/middleware/server-fn-error'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sanitizeServerFnError', () => {
  it('replaces a raw internal error with the generic message and logs no message', () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = sanitizeServerFnError(new Error('D1_ERROR: secret'), 'getSession')

    expect((result as Error).message).toBe(GENERIC_SERVER_FN_ERROR)
    expect(logError).toHaveBeenCalledTimes(1)
    expect(String(logError.mock.calls[0][0])).not.toContain('secret')
  })

  it('passes rate-limited errors through unchanged', () => {
    const error = new Error('rate-limited: Too many requests. Try again in a minute.')

    expect(sanitizeServerFnError(error, 'getIndex')).toBe(error)
  })

  it('passes Database unreachable through unchanged', () => {
    const error = new Error('Database unreachable')

    expect(sanitizeServerFnError(error, 'getDatabaseCheck')).toBe(error)
  })
})
