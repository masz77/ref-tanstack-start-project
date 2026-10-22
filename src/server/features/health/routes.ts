import { createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { checkDatabase, getHealthPayload, getIndexPayload } from '@/features/health/health.server'
import db from '@/server/infrastructure/db'
import { createRouter } from '@/server/lib/create-app'

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
  .openapi('HealthCheck')

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
      }),
    }),
  })
  .openapi('ApiIndex')

// 2026-05-24: Build the router as ONE fluent chain (was `const router = createRouter()`
// followed by standalone `router.openapi(...)` / `router.get(...)` calls). Each
// `.openapi()`/`.get()` returns a NEW router type that widens the `Schema` generic with
// that route — discarding the return value dropped those route types, so `/`, `/health`,
// and `/test` never appeared in AppType and `hc<AppType>` saw empty response bodies.
// Chaining keeps the accumulated type and is what gets exported.
//
// 2026-06-05: The two OpenAPI routes (`/`, `/health`) are chained FIRST, then the raw
// `.get()` route (`/test`). A raw `.get()` returns a plain `Hono` (no `.openapi` method),
// so calling `.openapi()` after a `.get()` is a type error. (The `/_logs` dashboard routes
// were removed with the `_log` DB logging stack — Workers Logs is now the only sink.)
const router = createRouter()
  .openapi(
    createRoute({
      tags: ['Index'],
      method: 'get',
      path: '/',
      summary: 'API Index',
      description: 'Returns API information and available endpoints',
      responses: {
        [HttpStatusCodes.OK]: jsonContent(indexResponseSchema, 'API Index Information'),
      },
    }),
    (c) => {
      return c.json({ data: getIndexPayload() }, HttpStatusCodes.OK)
    },
  )
  .openapi(
    createRoute({
      tags: ['Health'],
      method: 'get',
      path: '/health',
      summary: 'Health Check',
      description: 'Returns the health status of the API',
      responses: {
        [HttpStatusCodes.OK]: jsonContent(healthCheckSchema, 'Health Check Response'),
      },
    }),
    (c) => {
      return c.json({ data: getHealthPayload() }, HttpStatusCodes.OK)
    },
  )
  // DB liveness probe — confirms the D1 binding answers a trivial query.
  .get('/test', async (c) => {
    const reachable = await checkDatabase(() => db(c.env))

    if (reachable) {
      return c.json({ data: { message: 'Database reachable' } }, HttpStatusCodes.OK)
    }

    return c.json({ data: { message: 'Database unreachable' } }, HttpStatusCodes.INTERNAL_SERVER_ERROR)
  })

export default router
