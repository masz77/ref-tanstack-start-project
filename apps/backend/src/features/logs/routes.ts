import { createRouter } from "@/lib/create-app";
import type { AppBindings, AppRouteHandler } from "@/shared/types";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  cleanupLogsRoute,
  getEndpointMetricsRoute,
  getLogByIdRoute,
  getLogsByPathRoute,
  getLogsStatsForRangeRoute,
  getLogsStatsRoute,
  getRecentLogsRoute,
  testApiKeyRoute,
} from "./schemas";
import { createLogsService } from "./service";

/**
 * Validate API key for logs access
 */
function validateApiKey(c: Context<AppBindings>): void {
  const apiKey = c.req.header("x-api-key");
  const expectedKey = c.env.LOGS_API_KEY;

  if (!expectedKey) {
    throw new HTTPException(500, {
      message: "Server configuration error: LOGS_API_KEY not configured.",
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    throw new HTTPException(401, {
      message: "Invalid or missing API key. Please provide a valid x-api-key header.",
    });
  }
}

export const logsRouter = createRouter()
  .openapi(getLogsByPathRoute, (async (c) => {
    const query = c.req.valid("query");
    validateApiKey(c);

    try {
      const { path, ...options } = query;
      const logsService = createLogsService(c.env);
      const result = await logsService.getLogsByPath(path, options);
      return c.json(result, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve logs by path" });
    }
  }) as AppRouteHandler<typeof getLogsByPathRoute>)
  .openapi(testApiKeyRoute, (async (c) => {
    try {
      validateApiKey(c);
      return c.json({ success: true, message: "Connection successful" }, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to test connection" });
    }
  }) as AppRouteHandler<typeof testApiKeyRoute>)
  .openapi(getRecentLogsRoute, (async (c) => {
    validateApiKey(c);

    try {
      const query = c.req.valid("query");
      const logsService = createLogsService(c.env);
      const logs = await logsService.getRecentLogs(query.limit);
      return c.json(logs, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve recent logs" });
    }
  }) as AppRouteHandler<typeof getRecentLogsRoute>)
  .openapi(getLogsStatsRoute, (async (c) => {
    validateApiKey(c);

    try {
      const logsService = createLogsService(c.env);
      const stats = await logsService.getLogsStats();
      return c.json(stats, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve logs statistics" });
    }
  }) as AppRouteHandler<typeof getLogsStatsRoute>)
  .openapi(getLogsStatsForRangeRoute, (async (c) => {
    validateApiKey(c);

    try {
      const query = c.req.valid("query");
      const logsService = createLogsService(c.env);
      const stats = await logsService.getLogsStatsForRange(query.fromDate, query.toDate);
      return c.json(stats, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve logs statistics for range" });
    }
  }) as AppRouteHandler<typeof getLogsStatsForRangeRoute>)
  .openapi(getEndpointMetricsRoute, (async (c) => {
    validateApiKey(c);

    try {
      const query = c.req.valid("query");
      const logsService = createLogsService(c.env);
      const metrics = await logsService.getEndpointMetrics(query.limit);
      return c.json(metrics, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve endpoint metrics" });
    }
  }) as AppRouteHandler<typeof getEndpointMetricsRoute>)
  .openapi(getLogByIdRoute, (async (c) => {
    const { id } = c.req.valid("param");
    validateApiKey(c);

    try {
      const logsService = createLogsService(c.env);
      const log = await logsService.getLogById(id);
      return c.json(log, 200);
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to retrieve log" });
    }
  }) as AppRouteHandler<typeof getLogByIdRoute>)
  .openapi(cleanupLogsRoute, (async (c) => {
    const query = c.req.valid("query");
    validateApiKey(c);

    try {
      const { daysToKeep = 30 } = query;
      const logsService = createLogsService(c.env);
      const deletedCount = await logsService.cleanupOldLogs(daysToKeep);

      return c.json(
        {
          success: true,
          message: `Successfully cleaned up logs older than ${daysToKeep} days`,
          deletedCount,
          timestamp: new Date().toISOString(),
        },
        200,
      );
    } catch (error: any) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(500, { message: "Failed to cleanup logs" });
    }
  }) as AppRouteHandler<typeof cleanupLogsRoute>);

export default logsRouter;
