import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";
import type { MiddlewareHandler, Schema } from "hono";

import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import { apiLoggingMiddleware } from "@/middlewares/api-logger";
import { CloudflareRateLimitStore } from "@/lib/cloudflare-rate-limit-store";
import { createAuth } from "@/auth";

import type { AppBindings, AppOpenAPI } from "./types";

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

  return "*";
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
  const app = createRouter();
  app
    .use(requestId())
    .use(createDynamicCorsMiddleware())
    .use("*", async (c, next) => {
      const cf = (c.req.raw as Request & { cf?: IncomingRequestCfProperties }).cf;
      const auth = createAuth(c.env, cf);
      c.set("auth", auth);
      await next();
    })
    .use(rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // limit each IP to 100 requests per windowMs
      store: new CloudflareRateLimitStore(),
      keyGenerator: (c) => c.req.header("cf-connecting-ip")
        ?? c.req.header("x-forwarded-for")
        ?? c.req.header("x-real-ip")
        ?? c.req.raw.headers.get("host")
        ?? "unknown",
    }))
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
