import { createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import db from "@/infrastructure/db";
import { apiLogs } from "@/infrastructure/db/schema";
import { createRouter } from "@/lib/create-app";

// Health check response schema
// Wrapped in { data } to match the uniform success envelope (see CLAUDE.md / shared-types.md)
const healthCheckSchema = z
  .object({
    data: z.object({
      status: z.string(),
      timestamp: z.string(),
      uptime: z.number(),
      version: z.string(),
    }),
  })
  .openapi("HealthCheck");

// Index response schema
const indexResponseSchema = z
  .object({
    data: z.object({
      message: z.string(),
      version: z.string(),
      documentation: z.string(),
      endpoints: z.object({
        health: z.string(),
        docs: z.string(),
        reference: z.string(),
        logs: z.string(),
      }),
    }),
  })
  .openapi("ApiIndex");

const WORKER_START_TIME = Date.now();

// 2026-05-24: Build the router as ONE fluent chain (was `const router = createRouter()`
// followed by standalone `router.openapi(...)` / `router.get(...)` calls). Each
// `.openapi()`/`.get()` returns a NEW router type that widens the `Schema` generic with
// that route — discarding the return value dropped those route types, so `/`, `/health`,
// and `/test` never appeared in AppType and `hc<AppType>` saw empty response bodies.
// Chaining keeps the accumulated type and is what gets exported.
//
// 2026-05-24: The two OpenAPI routes (`/`, `/health`) are chained FIRST, then the raw
// `.get()` routes (`/test`, `/_logs`, `/_logs/*`). A raw `.get()` returns a plain `Hono`
// (no `.openapi` method), so calling `.openapi()` after a `.get()` is a type error.
// These paths don't overlap, so reordering does not change runtime matching; the
// `/_logs/*` wildcard still follows the `/_logs` exact route.
const router = createRouter()
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/",
      summary: "API Index",
      description: "Returns API information and available endpoints",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(indexResponseSchema, "API Index Information"),
      },
    }),
    (c) => {
      return c.json(
        {
          data: {
            message: "Welcome to Tasks API",
            version: "1.0.0",
            documentation: "Visit /reference for API documentation",
            endpoints: {
              health: "/health",
              docs: "/doc",
              reference: "/reference",
              logs: "/_logs",
            },
          },
        },
        HttpStatusCodes.OK,
      );
    },
  )
  .openapi(
    createRoute({
      tags: ["Health"],
      method: "get",
      path: "/health",
      summary: "Health Check",
      description: "Returns the health status of the API",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(healthCheckSchema, "Health Check Response"),
      },
    }),
    (c) => {
      const uptime = Math.floor((Date.now() - WORKER_START_TIME) / 1000);

      return c.json(
        {
          data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime,
            version: "1.0.0",
          },
        },
        HttpStatusCodes.OK,
      );
    },
  )
  .get("/test", async (c) => {
    try {
      const database = db(c.env);
      const now = new Date();
      const logId = crypto.randomUUID();

      await database.insert(apiLogs).values({
        id: logId,
        method: "GET",
        url: "http://localhost/test",
        path: "/test",
        statusCode: HttpStatusCodes.OK,
        responseBody: JSON.stringify({ ok: true }),
        startTime: now,
        endTime: now,
        duration: 0,
      });

      return c.json(
        {
          data: {
            message: "Test log inserted",
            id: logId,
          },
        },
        HttpStatusCodes.CREATED,
      );
    } catch (error) {
      return c.json(
        {
          data: {
            message: "Failed to insert test log",
          },
        },
        HttpStatusCodes.INTERNAL_SERVER_ERROR,
      );
    }
  })
  .get("/_logs", async (c) => {
    const assets = (c.env as any).ASSETS as
      | {
          fetch: (request: Request) => Promise<Response>;
        }
      | undefined;

    if (!assets) {
      return c.text("Logs dashboard not available", 404);
    }

    const url = new URL(c.req.url);
    url.pathname = "/_logs/index.html";

    const assetRequest = new Request(url.toString(), {
      method: "GET",
      headers: c.req.raw.headers,
    });

    try {
      const response = await assets.fetch(assetRequest);
      return response;
    } catch (error) {
      return c.text("Logs dashboard not available", 500);
    }
  })
  .get("/_logs/*", async (c) => {
    const assets = (c.env as any).ASSETS as
      | {
          fetch: (request: Request) => Promise<Response>;
        }
      | undefined;

    if (!assets) {
      return c.text("File not found", 404);
    }

    const incomingUrl = new URL(c.req.url);
    const assetPath = incomingUrl.pathname;

    const assetUrl = new URL(assetPath, incomingUrl);
    const assetRequest = new Request(assetUrl.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
    });

    try {
      const response = await assets.fetch(assetRequest);
      if (response.status === 404) {
        return c.text("File not found", 404);
      }
      return response;
    } catch (error) {
      return c.text("File not found", 404);
    }
  });

export default router;
