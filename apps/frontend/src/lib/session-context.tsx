import { useRouter } from '@tanstack/react-router'
import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
import { type SessionUser, useSessionQuery } from '@/lib/queries/session'

// 2026-05-29: This context is a THIN ADAPTER over the existing react-query
// `sessionQueryOptions` (`@/lib/queries/session`) — deliberately NOT
// better-auth's `authClient.useSession()`. Reusing the `['session']` cache
// keeps sign-out, cross-tab BroadcastChannel sync, and any future enrichment
// mutations working untouched — they all share this cache. If you later add
// `customSession` enrichment on the backend, the new fields surface here via
// the typed `SessionUser` without any changes to this file.
export type SessionContextValue = {
  user: SessionUser | null
  isLoading: boolean
  isAuthenticated: boolean
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useSessionQuery()

  const user = data?.user ?? null

  // Memoize over PRIMITIVE-stable deps (user reference + isPending) so
  // AuthSync's effect — which depends on this value — doesn't thrash on every
  // unrelated render. The query returns the same `data` reference until the
  // cache changes, so `user` is reference-stable between renders.
  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      isLoading: isPending,
      isAuthenticated: !!user,
    }),
    [user, isPending],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}

// 2026-05-29: AuthSync injects the resolved auth into the TanStack Router
// context so synchronous `beforeLoad` guards can read `context.auth`.
// `router.invalidate()` re-runs all beforeLoads once auth settles (the effect
// dep is the memoized auth value, so it's a one-time re-eval per cache flip,
// not a loop). When the `['session']` cache changes (cross-tab sign-out, the
// sign-out hook, expiry), the value changes → guards re-run → redirect.
export function AuthSync() {
  const auth = useSession()
  const router = useRouter()

  useEffect(() => {
    router.update({ context: { ...router.options.context, auth } })
    if (!auth.isLoading) {
      router.invalidate()
    }
  }, [auth, router])

  return null
}
