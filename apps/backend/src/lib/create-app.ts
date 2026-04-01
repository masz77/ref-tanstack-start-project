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
import { CloudflareRateLimitStore } from "@/lib/cloudflare-rate-limit-store";
import { apiLoggingMiddleware } from "@/middleware/api-logger";

import type { AppBindings, AppOpenAPI } from "@/shared/types";

export function createRouter(): OpenAPIHono<AppBindings> {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

function resolveCorsOrigins(env: Record<string, unknown>) {
  const rawOrigins = (env as any)?.CORS_ORIGINS;

  if (Array.isArray(rawOrigins)) {
    return rawOrigins.map((origin) => String(origin));
  }

  if (typeof rawOrigins === "string") {
    return rawOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Default to common local dev origins when CORS_ORIGINS not configured
  return ["http://localhost:3000", "http://localhost:5173", "http://localhost:8787"];
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

export default function createApp(): OpenAPIHono<AppBindings> {
  // Create emitter with registered listeners
  const emitter = createEmitter<AppEvents>();

  // Register event listeners
  emitter.on("user:created", onUserCreated);
  emitter.on("user:deleted", onUserDeleted);
  emitter.on("auth:session-created", onAuthSessionCreated);
  emitter.on("subscription:changed", onSubscriptionChanged);

  const app = createRouter();
  app
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
    .use(apiLoggingMiddleware());

  app.notFound(notFound);
  app.onError(onError);
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  const app = createApp();

  return app.route("/", router);
}
