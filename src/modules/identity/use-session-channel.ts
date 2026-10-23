import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { subscribeToSessionEvents } from './session-channel'
import { sessionQueryOptions } from './session.queries'

// 2026-05-29: Mount once at the root. Listens for cross-tab session events
// posted by useSignOut / login / signup and mutates the shared queryClient
// cache so route guards re-evaluate automatically in the receiving tab. The
// handler never re-posts — that would loop. The client comes from context, so
// the cache update is observed by every component using react-query.
// 2026-10-22: mounted inside SessionProvider (under QueryClientProvider) so it reads the client from context; the identity module never imports the app shell.
export function useSessionChannel() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = subscribeToSessionEvents((event) => {
      if (event.type === 'signed-out') {
        // Authoritative: another tab just signed out. Drop the session
        // synchronously so guards bounce this tab too.
        queryClient.setQueryData(sessionQueryOptions.queryKey, null)
        return
      }
      if (event.type === 'signed-in') {
        // Don't trust the sender's user object — refetch from the getSession
        // server function so this tab pulls fresh server-truth.
        void queryClient.invalidateQueries({
          queryKey: sessionQueryOptions.queryKey,
        })
      }
    })
    return unsubscribe
  }, [queryClient])
}
