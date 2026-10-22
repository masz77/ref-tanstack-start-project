import { queryOptions, useQuery } from '@tanstack/react-query'
import { getSession } from '@/features/session/session.functions'

// 2026-10-22: Session now comes from the `getSession` server function (same origin, no HTTP route).
export type SessionData = NonNullable<Awaited<ReturnType<typeof getSession>>>
export type SessionUser = SessionData['user']

// why: `null` means logged out (a normal state for the guards); a thrown error means the lookup failed and must not read as logged out.
export const sessionQueryOptions = queryOptions({
  queryKey: ['session'] as const,
  queryFn: () => getSession(),
  staleTime: 60_000,
  retry: false,
})

export function useSessionQuery() {
  return useQuery(sessionQueryOptions)
}
