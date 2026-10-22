import { createMiddleware } from '@tanstack/react-start'

// Health/doc paths are polled or noisy; static assets carry a file extension.
const SKIP_PATHS = new Set(['/api/health', '/api/doc', '/api/reference'])
const STATIC_ASSET = /\.[a-z0-9]+$/i

export function shouldLogRequest(method: string, pathname: string): boolean {
  return method !== 'OPTIONS' && !SKIP_PATHS.has(pathname) && !STATIC_ASSET.test(pathname)
}

// why: only these keys are emitted. Bodies, headers, cookies, tokens, emails and IPs stay out of Workers Logs.
export function emitRequestLog(entry: {
  method: string
  path: string
  status: number
  durationMs: number
  requestId?: string
}) {
  // why: logging must never break the request, so serialization errors are swallowed.
  try {
    // oxlint-disable-next-line no-console -- structured request log; Workers Logs is the sink
    console.log(JSON.stringify({ type: 'request', ...entry }))
  } catch {
    // Intentionally ignore logging failures.
  }
}

// why: request middleware runs for pages, server functions and /api routes alike, so one line covers every request.
export const requestLogMiddleware = createMiddleware().server(
  async ({ request, pathname, next }) => {
    if (!shouldLogRequest(request.method, pathname)) {
      return next()
    }

    const start = Date.now()
    const result = await next()

    emitRequestLog({
      method: request.method,
      path: pathname,
      status: result.response.status,
      durationMs: Date.now() - start,
      // shortcut: cf-ray is Cloudflare's per-request id, not a Hono requestId, upgrade if log correlation needs an app-generated id
      requestId: request.headers.get('cf-ray') ?? undefined,
    })

    return result
  },
)
