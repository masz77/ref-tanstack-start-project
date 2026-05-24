import { queryOptions } from '@tanstack/react-query'
import { createApiClient } from '@/lib/api-client'
import type {
  ApiIndexResponse,
  HealthResponse,
  LogsStatsResponse,
  RecentLogItem,
  TestResponse,
} from '@/lib/contracts'

/**
 * TanStack Query `queryOptions` factories for the `/template` page.
 *
 * Each queryFn creates the RPC client inside the function (per api-client.ts
 * JSDoc — never at module level), calls the route, guards `res.ok`, and returns
 * the PEELED `.data` typed to the matching `@/lib/contracts` export. On a
 * non-2xx response we throw so React Query surfaces an error state that is
 * distinguishable from an empty result (per the api-response-handling rule).
 */

export const healthQueryOptions = queryOptions({
  queryKey: ['template', 'health'] as const,
  queryFn: async (): Promise<HealthResponse> => {
    const api = createApiClient()
    const res = await api.health.$get()
    if (!res.ok) {
      throw new Error(`Health check failed (${res.status})`)
    }
    const { data } = await res.json()
    return data
  },
})

export const apiIndexQueryOptions = queryOptions({
  queryKey: ['template', 'index'] as const,
  queryFn: async (): Promise<ApiIndexResponse> => {
    const api = createApiClient()
    const res = await api.index.$get()
    if (!res.ok) {
      throw new Error(`API index request failed (${res.status})`)
    }
    const { data } = await res.json()
    return data
  },
})

export const testQueryOptions = queryOptions({
  queryKey: ['template', 'test'] as const,
  queryFn: async (): Promise<TestResponse> => {
    const api = createApiClient()
    // This endpoint has a WRITE side-effect: it inserts a D1 `apiLogs` row and
    // returns 201. It should NOT be refetched aggressively — rely on the
    // default staleTime plus a manual refetch rather than a low staleTime here.
    const res = await api.test.$get()
    if (!res.ok) {
      throw new Error(`Test endpoint failed (${res.status})`)
    }
    const { data } = await res.json()
    return data
  },
})

export const logsRecentQueryOptions = (apiKey: string) =>
  queryOptions({
    queryKey: ['template', 'logs', 'recent', apiKey] as const,
    queryFn: async (): Promise<RecentLogItem[]> => {
      const api = createApiClient()
      // x-api-key is REQUIRED — the Hono RPC types put validated request
      // headers in the FIRST arg under `header` (alongside `query`), NOT via
      // createApiClient's bearer token nor a second-arg init option.
      const res = await api.v1.logs.recent.$get({
        query: { limit: 20 },
        header: { 'x-api-key': apiKey },
      })
      if (!res.ok) {
        throw new Error(`Recent logs request failed (${res.status})`)
      }
      const { data } = await res.json()
      return data
    },
    // Stay idle until an API key is entered.
    enabled: Boolean(apiKey),
  })

export const logsStatsQueryOptions = (apiKey: string) =>
  queryOptions({
    queryKey: ['template', 'logs', 'stats', apiKey] as const,
    queryFn: async (): Promise<LogsStatsResponse> => {
      const api = createApiClient()
      // This route takes no query params — only the required `header`.
      const res = await api.v1.logs.stats.$get({
        header: { 'x-api-key': apiKey },
      })
      if (!res.ok) {
        throw new Error(`Logs stats request failed (${res.status})`)
      }
      const { data } = await res.json()
      return data
    },
    enabled: Boolean(apiKey),
  })
