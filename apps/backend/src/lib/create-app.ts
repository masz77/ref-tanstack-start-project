import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";
import type { MiddlewareHandler, Schema } from "hono";

import { createEmitter } from "@hono/event-emitter";
import { OpenAPIHono } from "@hono/zod-openapi";
import { rateLimiter } from "hono-rate-limiter";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { createAuth } from "@/auth";
import {
  onAuthSessionCreated,
  onSubscriptionChanged,
  onUserCreated,
  onUserDeleted,
} from "@/infrastructure/events/listeners";
import type { AppEvents } from "@/infrastructure/events/types";
import { cacheControlMiddleware } from "@/lib/cache-control";
import { CloudflareRateLimitStore } from "@/lib/cloudflare-rate-limit-store";
import { resolveCorsOrigins } from "@/lib/resolve-origins";
import { requestLogMiddleware } from "@/middleware/request-log";

import type { AppBindings, AppOpenAPI } from "@/shared/types";

// 2026-05-24: Removed the `: OpenAPIHono<AppBindings>` return annotation. Annotating
// the return type pins the `Schema` generic to its default `{}`, so when callers chain
// `.openapi(...)`/`.get(...)` the accumulated route schemas can't widen the type — RPC
// inference (`hc<AppType>`) needs that widened Schema to flow through. Let it infer.
export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

function resolveCorsMaxAge(env: Record<string, unknown>) {
  const raw = (env as any)?.CORS_MAX_AGE;
  if (typeof raw === "number") {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 86400;
}

function createDynamicCorsMiddleware(): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const handler = cors({
      origin: resolveCorsOrigins(c.env as unknown as Record<string, unknown>),
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
      credentials: true,
      maxAge: resolveCorsMaxAge(c.env as unknown as Record<string, unknown>),
    });

    return handler(c, next);
  };
}

// 2026-05-24: No return annotation here either — keep the inferred Schema so the
// router chain in app.ts (`createApp().route(...).route(...)`) accumulates real route
// types into AppType instead of collapsing to `{}`.
export default function createApp() {
  // Create emitter with registered listeners
  const emitter = createEmitter<AppEvents>();

  // Register event listeners
  emitter.on("user:created", onUserCreated);
  emitter.on("user:deleted", onUserDeleted);
  emitter.on("auth:session-created", onAuthSessionCreated);
  emitter.on("subscription:changed", onSubscriptionChanged);

  const app = createRouter();
  app
    // 2026-07-08: registered cacheControlMiddleware (outermost) — why: stamps after every
    // route incl. /api/auth/*; see docs/ARCHITECTURE/response-caching.md
    .use(cacheControlMiddleware())
    .use(requestId())
    .use(createDynamicCorsMiddleware())
    .use("*", async (c, next) => {
      const cf = (c.req.raw as Request & { cf?: IncomingRequestCfProperties }).cf;
      const auth = createAuth(c.env, cf);
      c.set("auth", auth);
      c.set("emitter", emitter);
      await next();
    })
    .use(
      rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // limit each IP to 100 requests per windowMs
        store: new CloudflareRateLimitStore(),
        keyGenerator: (c) =>
          c.req.header("cf-connecting-ip") ??
          c.req.header("x-forwarded-for") ??
          c.req.header("x-real-ip") ??
          c.req.raw.headers.get("host") ??
          "unknown",
      }),
    )
    .use(serveEmojiFavicon("📝"))
    // 2026-06-05: Request logging is now a single structured console.log line per request
    // (Cloudflare Workers Logs is the only sink). Replaces the old `_log` DB table stack.
    .use(requestLogMiddleware());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  const app = createApp();

  return app.route("/", router);
}
