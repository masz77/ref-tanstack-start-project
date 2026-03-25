import { createAuthClient } from 'better-auth/client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8787'

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  getSession,
} = authClient
