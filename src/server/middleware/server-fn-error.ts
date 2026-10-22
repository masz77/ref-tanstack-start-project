import { isNotFound, isRedirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'

export const GENERIC_SERVER_FN_ERROR = 'Something went wrong. Try again.'

// why: these messages are written for the client on purpose (UI branches on them), so they pass through unchanged. Every other message can carry internal text (D1 errors, SQL), so it is replaced.
const PASS_THROUGH_MESSAGES = new Set(['Database unreachable'])
const PASS_THROUGH_PREFIXES = ['rate-limited:']

export function sanitizeServerFnError(error: unknown, fn: string): unknown {
  if (isRedirect(error) || isNotFound(error)) {
    return error
  }

  const message = error instanceof Error ? error.message : ''
  if (
    PASS_THROUGH_MESSAGES.has(message) ||
    PASS_THROUGH_PREFIXES.some((prefix) => message.startsWith(prefix))
  ) {
    return error
  }

  // why: only the function and error name are logged; the raw message and stack can carry internal details.
  // oxlint-disable-next-line no-console -- server function failure log; Workers Logs is the sink
  console.error(
    JSON.stringify({
      type: 'serverFn-error',
      fn,
      name: error instanceof Error ? error.name : typeof error,
    }),
  )

  return new Error(GENERIC_SERVER_FN_ERROR)
}

export const serverFnErrorMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ serverFnMeta, next }) => {
    try {
      return await next()
    } catch (error) {
      throw sanitizeServerFnError(error, serverFnMeta.name)
    }
  },
)
