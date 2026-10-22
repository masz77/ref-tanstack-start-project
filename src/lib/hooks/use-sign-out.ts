import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { signOut as betterAuthSignOut } from '@/lib/auth-client'
import { sessionQueryOptions } from '@/lib/queries/session'
import { postSessionEvent } from '@/lib/session-channel'

interface UseSignOutOptions {
  // Runs after better-auth + cache invalidation succeed, before navigation.
  // Use for caller-local cleanup (e.g. closing a confirm dialog).
  onBeforeNavigate?: () => void
  // Where to send the user after a successful sign-out. Defaults to /login.
  redirectTo?: string
}

// 2026-05-29: Centralized sign-out. The cache-clear step (setQueryData +
// invalidateQueries on sessionQueryOptions) is load-bearing — without it
// /login's beforeLoad reads a stale "logged-in" session and bounces the user
// straight back to wherever they came from. Every sign-out callsite must go
// through this hook so the cache-clear can't be forgotten.
export function useSignOut(options?: UseSignOutOptions) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)
  // `isFinalizing` covers the post-success window — after the better-auth API
  // resolves, while we clear caches, notify other tabs, and navigate. Mount
  // a blocking spinner / disable controls during this window so a fast user
  // can't re-click sign-out during that gap.
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = async () => {
    if (isSigningOut) return
    setError(null)
    setIsSigningOut(true)
    try {
      const result = await betterAuthSignOut()
      if (result?.error) {
        throw new Error(result.error.message ?? 'Sign-out failed')
      }
      setIsFinalizing(true)
      queryClient.setQueryData(sessionQueryOptions.queryKey, null)
      await queryClient.invalidateQueries({
        queryKey: sessionQueryOptions.queryKey,
      })
      // Notify other tabs so they invalidate their session cache immediately
      // instead of waiting for the staleTime / focus refetch.
      postSessionEvent({ type: 'signed-out' })
      options?.onBeforeNavigate?.()
      await navigate({ to: options?.redirectTo ?? '/login' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed'
      setError(message)
      setIsFinalizing(false)
      setIsSigningOut(false)
    }
  }

  return { signOut, isSigningOut, isFinalizing, error }
}
