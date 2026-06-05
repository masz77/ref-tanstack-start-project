import type { MiddlewareHandler } from "hono";

// Paths that are noisy or health/doc-only — skip emitting a request log line for them.
const SKIP_PATHS = new Set(["/health", "/doc", "/reference", "/favicon.ico"]);

/**
 * Structured request logger. Emits exactly one JSON line per request to stdout so
 * Cloudflare Workers Logs is the only sink — no DB writes, no request/response bodies.
 *
 * why: replaces the old `_log` Postgres/D1 logging stack. Workers Logs captures
 * console output, so a single structured line is enough for request observability.
 */
export function requestLogMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;
    const path = new URL(c.req.url).pathname;

    if (method === "OPTIONS" || SKIP_PATHS.has(path)) {
      await next();
      return;
    }

    const start = Date.now();
    await next();
    const durationMs = Date.now() - start;

    // why: logging must never break the request — swallow any serialization error.
    try {
      const requestId = c.get("requestId" as never) as string | undefined;
      const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip");
      const userId = (c.get("user") as { id?: string } | undefined)?.id;

      const entry: Record<string, unknown> = {
        type: "request",
        method,
        path,
        status: c.res.status,
        durationMs,
      };
      if (requestId) {
        entry.requestId = requestId;
      }
      if (ip) {
        entry.ip = ip;
      }
      if (userId) {
        entry.userId = userId;
      }

      // biome-ignore lint/suspicious/noConsole: structured request log — Workers Logs is the sink
      // biome-ignore lint/suspicious/noConsoleLog: intentional single-line request log
      console.log(JSON.stringify(entry));
    } catch {
      // Intentionally ignore logging failures.
    }
  };
}
