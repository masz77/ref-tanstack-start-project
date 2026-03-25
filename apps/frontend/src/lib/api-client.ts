import type { AppType } from '@repo/backend'
import { hc } from 'hono/client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8787'

/**
 * Creates a typed Hono RPC client.
 * Use inside components or server functions — NOT at module level.
 *
 * Usage (unauthenticated):
 *   const api = createApiClient()
 *   const res = await api.health.$get()
 *   const data = await res.json()  // fully typed
 *
 * Usage (authenticated):
 *   const api = createApiClient(accessToken)
 *   const res = await api['v1']['some-route'].$get()
 */
export function createApiClient(accessToken?: string) {
  return hc<AppType>(BACKEND_URL, {
    headers: accessToken
      ? { Authorization: `Bearer ${accessToken}` }
      : undefined,
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
