// 2026-05-29: BroadcastChannel-based cross-tab session sync.
// WHY: When a user signs out (or in) in tab A, tab B should pick up the new
// auth state within ~1 frame, not after the 60s sessionQueryOptions staleTime
// or a window-focus refetch. better-auth doesn't broadcast on its own — a
// same-origin BroadcastChannel avoids polling and works across all modern
// browsers without a server roundtrip.
//
// SSR safety: TanStack Start renders this app on the server; `window` and
// `BroadcastChannel` are window-only. Post no-ops on the server; subscribe
// returns a no-op unsubscribe so callers can still wire it in effects.

export type SessionEvent = { type: 'signed-out' } | { type: 'signed-in' }

const CHANNEL_NAME = 'app-session'

function isClient() {
  return typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
}

export function postSessionEvent(event: SessionEvent) {
  if (!isClient()) return
  const channel = new BroadcastChannel(CHANNEL_NAME)
  try {
    channel.postMessage(event)
  } finally {
    channel.close()
  }
}

export function subscribeToSessionEvents(handler: (event: SessionEvent) => void): () => void {
  if (!isClient()) return () => {}
  const channel = new BroadcastChannel(CHANNEL_NAME)
  const listener = (e: MessageEvent<SessionEvent>) => {
    handler(e.data)
  }
  channel.addEventListener('message', listener)
  return () => {
    channel.removeEventListener('message', listener)
    channel.close()
  }
}
