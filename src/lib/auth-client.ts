import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/client'

// 2026-10-22: no baseURL — better-auth defaults to window.location.origin + /api/auth,
// so the browser calls its own origin (the API is served by the same Worker).

// 2026-05-29: passkeyClient() surfaces signIn.passkey() and the
// passkey.addPasskey() management API. The server-side `passkey()` plugin must
// be wired in src/server/auth/index.ts; both sides must agree on the
// plugin set or client types drift from the runtime contract.
export const authClient = createAuthClient({
  plugins: [passkeyClient()],
})

export const { signIn, signOut, signUp, useSession, getSession, passkey } = authClient
