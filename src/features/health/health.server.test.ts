import { describe, expect, it } from 'vite-plus/test'
import { checkDatabase } from './health.server'

describe('checkDatabase', () => {
  it('reports reachable when the handle answers the query', async () => {
    const handle = { run: async () => undefined }

    await expect(checkDatabase(() => handle)).resolves.toBe(true)
  })

  it('reports unreachable when the handle throws (control case)', async () => {
    const handle = {
      run: async () => {
        throw new Error('D1 down')
      },
    }

    await expect(checkDatabase(() => handle)).resolves.toBe(false)
  })
})
