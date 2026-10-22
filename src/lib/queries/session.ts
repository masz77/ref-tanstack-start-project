import { queryOptions, useQuery } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { type ApiClient, ApiError, createApiClient } from '@/lib/api-client'

// 2026-05-29: Derived from the Hono RPC AppType so additions to the BE session
// schema (e.g. when you wire `customSession` to add role/tenant) flow through
// automatically. Status-narrowed to 200 because the route also documents 500;
// without narrowing, `.data` would peel across the union and collapse.
type SessionResponse = InferResponseType<ApiClient['api']['session']['$get'], 200>['data']

export type SessionUser = NonNullable<SessionResponse>['user']
export type SessionData = NonNullable<SessionResponse>

// 2026-05-29: Backend `/api/session` returns HTTP 200 with `data: null` when
// no session. Treat a 401 the same way — both mean "logged out" — so callers
// only ever see `null` for the not-authenticated case. Other non-2xx are
// genuinely exceptional (network blip, CORS, backend outage) and bubble as
// `ApiError` so route error boundaries can distinguish them from "no session"
// instead of falsely bouncing the user to /login.
async function fetchSession() {
  const api = createApiClient()
  const res = await api.api.session.$get()
  const status = (res as Response).status
  if (status === 401) return null
  if (!res.ok) throw new ApiError(status, `Failed to load session (${status})`)
  const body = await res.json()
  return body.data
}

export const sessionQueryOptions = queryOptions({
  queryKey: ['session'] as const,
  queryFn: fetchSession,
  staleTime: 60_000,
  retry: false,
})

export function useSessionQuery() {
  return useQuery(sessionQueryOptions)
}
