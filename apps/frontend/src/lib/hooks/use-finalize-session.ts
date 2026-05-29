import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { sessionQueryOptions } from '@/lib/queries/session'
import { postSessionEvent } from '@/lib/session-channel'

// 2026-05-29: Centralized post-sign-in finalization. Both /login and /signup
// must run the exact same sequence after better-auth establishes a session, so
// it lives here once (mirrors the useSignOut centralization pattern) and can't
// drift between the two callsites.
export function useFinalizeSession() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return async () => {
    // Must use `fetchQuery` (forces a network fetch), not `invalidateQueries`
    // + `ensureQueryData`. The auth pages' beforeLoad already cached `null` for
    // the session; `invalidateQueries` only marks stale, and with no active
    // observer it does not refetch. `ensureQueryData` then returns the stale
    // `null` and /-guard sees no user.
    await queryClient.fetchQuery(sessionQueryOptions)
    // Post after fetchQuery so any race within this tab sees the fresh
    // session before observers in sibling tabs invalidate.
    postSessionEvent({ type: 'signed-in' })
    await navigate({ to: '/' })
  }
}
