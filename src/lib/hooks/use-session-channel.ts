import { useEffect } from 'react'
import { sessionQueryOptions } from '@/lib/queries/session'
import { subscribeToSessionEvents } from '@/lib/session-channel'
import { queryClient } from '@/router'

// 2026-05-29: Mount once at the root. Listens for cross-tab session events
// posted by useSignOut / login / signup and mutates the shared queryClient
// cache so route guards re-evaluate automatically in the receiving tab. The
// handler never re-posts — that would loop. We use the module-level
// `queryClient` singleton from `@/router` (the same one __root.tsx provides)
// so the cache update is observed by every component using react-query.
export function useSessionChannel() {
  useEffect(() => {
    const unsubscribe = subscribeToSessionEvents((event) => {
      if (event.type === 'signed-out') {
        // Authoritative: another tab just signed out. Drop the session
        // synchronously so guards bounce this tab too.
        queryClient.setQueryData(sessionQueryOptions.queryKey, null)
        return
      }
      if (event.type === 'signed-in') {
        // Don't trust the sender's user object — refetch from /api/session
        // so this tab pulls fresh server-truth.
        void queryClient.invalidateQueries({
          queryKey: sessionQueryOptions.queryKey,
        })
      }
    })
    return unsubscribe
  }, [])
}
