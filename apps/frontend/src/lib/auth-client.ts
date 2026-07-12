import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/client'

// 2026-05-29: Strip trailing slash(es). A trailing slash in VITE_BACKEND_URL
// (e.g. "https://your-api.workers.dev/") makes the Hono RPC client build
// "//api/session", which the deployed Worker router 404s on. Normalize here so
// every client path stays single-slashed regardless of how the env is written.
// 2026-07-13: localhost fallback is now dev-only — see api-client.ts note
// (prod build with unset VITE_BACKEND_URL triggered Chrome's Local Network
// Access prompt on the deployed site).
const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL ?? (import.meta.env.DEV ? 'http://localhost:8787' : '')
).replace(/\/+$/, '')

// 2026-05-29: passkeyClient() surfaces signIn.passkey() and the
// passkey.addPasskey() management API. The server-side `passkey()` plugin must
// be wired in apps/backend/src/auth/index.ts; both sides must agree on the
// plugin set or client types drift from the runtime contract.
export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [passkeyClient()],
})

export const { signIn, signOut, signUp, useSession, getSession, passkey } = authClient
