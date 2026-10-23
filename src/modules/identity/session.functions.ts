import { createServerFn } from '@tanstack/react-start'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { createAuthForRequest } from '@/server/auth'

// why: auth is built per request from the Workers env (D1 + KV). The module-level `auth`
// singleton has no bindings, so it cannot resolve a session.
export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const auth = createAuthForRequest(env, request)
  const { headers, response } = await auth.api.getSession({
    headers: request.headers,
    returnHeaders: true,
  })

  // why: better-auth refreshes the session cookie here (updateAge, cookieCache); dropping its set-cookie signs active users out.
  setResponseHeader('set-cookie', headers.getSetCookie())
  // why: the response carries session data, so Workers Cache must not store it (same policy as the old /api/session).
  setResponseHeader('cache-control', 'private, no-store')

  if (!response?.user || !response?.session) return null

  // why: the bearer `token` stays in the HttpOnly cookie; returning it would expose it to browser JS.
  const { id, userId, expiresAt, createdAt, updatedAt } = response.session
  return { user: response.user, session: { id, userId, expiresAt, createdAt, updatedAt } }
})
