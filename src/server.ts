import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types'
import serverEntry from '@tanstack/react-start/server-entry'
import type { Env } from '@/server/infrastructure/db'
import { handleQueue } from '@/server/infrastructure/queue/handler'
import type { QueueMessage } from '@/server/infrastructure/queue/types'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  // why: strict-origin-when-cross-origin keeps paths out of cross-site Referer headers.
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // why: no legit framing of this app, so both CSP and X-Frame-Options deny it (old browsers read only XFO).
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
}

// why: always copies the response, because Response.redirect() and fetch() results have immutable headers.
export function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)

  // why: browsers ignore HSTS on plain http, so only https responses carry it.
  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

export default {
  async fetch(request: Request): Promise<Response> {
    const response = await serverEntry.fetch(request)
    return withSecurityHeaders(response, request)
  },
  async queue(batch: MessageBatch<QueueMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleQueue(batch, env)
  },
}
