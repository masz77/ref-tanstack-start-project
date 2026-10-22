import { createCsrfMiddleware, createMiddleware, createStart } from '@tanstack/react-start'
import { getRequest, setResponseStatus } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { checkRateLimit, clientKey, RATE_LIMITED_MESSAGE } from '@/server/lib/rate-limit'
import { requestLogMiddleware } from '@/server/middleware/request-log'
import { serverFnErrorMiddleware } from '@/server/middleware/server-fn-error'

// why: defining src/start.ts turns off TanStack's default CSRF middleware (createStartHandler.js:302 uses only the requestMiddleware listed here), so it is re-added for server functions. Default source: createStartHandler.js:59.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

const rateLimitMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { limited } = await checkRateLimit(clientKey(getRequest()), env.RATE_LIMITER)
  if (limited) {
    setResponseStatus(429)
    throw new Error(RATE_LIMITED_MESSAGE)
  }

  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [requestLogMiddleware, csrfMiddleware],
  functionMiddleware: [serverFnErrorMiddleware, rateLimitMiddleware],
}))
