import { paginationSchema } from "@/shared/schemas";
import { createRoute, z } from "@hono/zod-openapi";

// =============================================================================
// BASE LOGS SCHEMAS
// =============================================================================

// Base API log schema mapped from database structure
const baseApiLogSchema = z
  .object({
    method: z.string().min(1),
    url: z.string().min(1),
    path: z.string().min(1),
    statusCode: z.number().int().optional(),
    duration: z.number().int().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    errorMessage: z.string().optional(),
    requestHeaders: z.record(z.string()).nullable().optional(),
    requestBody: z.any().nullable().optional(),
    responseBody: z.any().nullable().optional(),
    responseHeaders: z.record(z.string()).nullable().optional(),
  })
  .openapi("BaseApiLog");

// =============================================================================
// RESPONSE SCHEMAS (extending base with computed fields)
// =============================================================================

// Log item response schema - essential fields for list views
export const logItemResponseSchema = z
  .object({
    id: z.string().uuid(),
    method: z.string(),
    url: z.string(),
    path: z.string(),
    statusCode: z.number().optional(),
    duration: z.number().optional(),
    userAgent: z.string().optional(),
    ipAddress: z.string().optional(),
    errorMessage: z.string().optional(),
    createdAt: z.string(),

    // Extended fields for detailed responses
    requestHeaders: z.record(z.string()).nullable().optional(),
    requestBody: z.any().nullable().optional(),
    responseBody: z.any().nullable().optional(),
    responseHeaders: z.record(z.string()).nullable().optional(),
  })
  .openapi("LogItem");

// Log detail response schema - full information for single log view
export const logDetailResponseSchema = baseApiLogSchema
  .extend({
    // System-generated fields
    id: z.string().uuid(),
    createdAt: z.string(),
  })
  .openapi("LogDetail");

// =============================================================================
// REUSABLE RESPONSE WRAPPERS
// =============================================================================

const logsByPathResponseSchema = z
  .object({
    data: z.array(logItemResponseSchema),
    pagination: paginationSchema,
    summary: z.object({
      path: z.string(),
      totalRequests: z.number(),
      method: z.string().optional(),
      statusCode: z.number().optional(),
    }),
  })
  .openapi("LogsByPathResponse");

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

const tags = ["Logs"];

export const getLogByIdRoute = createRoute({
  path: "/v1/logs/{id}",
  method: "get",
  summary: "Get API log details",
  description:
    "Retrieve detailed information for a specific API log entry. Requires x-api-key header for authentication.",
  tags,
  request: {
    params: z
      .object({
        id: z.string().uuid(),
      })
      .openapi("LogParams"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("LogHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: logDetailResponseSchema,
        },
      },
      description: "API log details",
    },
    404: {
      description: "Log not found",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const getLogsByPathRoute = createRoute({
  path: "/v1/logs/by-path",
  method: "get",
  summary: "Get API logs by specific path",
  description:
    "Retrieve API logs filtered by a specific path with enhanced performance optimization. Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z
      .object({
        path: z.string().describe("The exact path to filter logs by (e.g., '/v1/auth/signin')"),
        page: z.coerce.number().min(1).default(1).optional(),
        limit: z.coerce.number().min(1).max(100).default(20).optional(),
        method: z.string().optional().describe("HTTP method filter"),
        statusCode: z.coerce.number().optional().describe("HTTP status code filter"),
        fromDate: z.string().datetime().optional().describe("Filter logs from this date"),
        toDate: z.string().datetime().optional().describe("Filter logs to this date"),
      })
      .openapi("LogsByPathQuery"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("LogsByPathHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: logsByPathResponseSchema,
        },
      },
      description: "API logs filtered by path",
    },
    400: {
      description: "Validation error",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const testApiKeyRoute = createRoute({
  path: "/v1/logs/test",
  method: "get",
  summary: "Test API key validation",
  description:
    "A simple endpoint to test if the x-api-key header is valid. Returns success message if API key is correct.",
  tags,
  request: {
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("TestApiKeyHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean(),
              message: z.string(),
              timestamp: z.string(),
            })
            .openapi("TestApiKeyResponse"),
        },
      },
      description: "API key is valid",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const getRecentLogsRoute = createRoute({
  path: "/v1/logs/recent",
  method: "get",
  summary: "Get recent API logs",
  description:
    "Retrieve the most recent API log entries with essential fields (id, method, path, statusCode, duration, createdAt). Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z
      .object({
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .default(50)
          .optional()
          .describe("Maximum number of recent logs to return"),
      })
      .openapi("RecentLogsQuery"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("RecentLogsHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .array(
              z.object({
                id: z.string().uuid(),
                method: z.string(),
                path: z.string(),
                statusCode: z.number().optional(),
                duration: z.number().optional(),
                createdAt: z.string(),
              }),
            )
            .openapi("RecentLogsResponse"),
        },
      },
      description: "Recent API logs",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const getLogsStatsForRangeRoute = createRoute({
  path: "/v1/logs/stats-range",
  method: "get",
  summary: "Get API logs statistics for a date range",
  description:
    "Retrieve statistics for API logs within a specific date range including total requests, errors, average duration, and error rate. Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z
      .object({
        fromDate: z.string().datetime().describe("Start date for the range (ISO 8601 format)"),
        toDate: z.string().datetime().describe("End date for the range (ISO 8601 format)"),
      })
      .openapi("LogsStatsRangeQuery"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("LogsStatsRangeHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({
              total: z.number(),
              errors: z.number(),
              avgDuration: z.number().nullable(),
              minDuration: z.number().nullable(),
              maxDuration: z.number().nullable(),
              errorRate: z.string(),
              dateRange: z.object({
                from: z.string(),
                to: z.string(),
              }),
            })
            .openapi("LogsStatsRangeResponse"),
        },
      },
      description: "API logs statistics for the specified date range",
    },
    400: {
      description: "Validation error - Invalid date format",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const getLogsStatsRoute = createRoute({
  path: "/v1/logs/stats",
  method: "get",
  summary: "Get API logs statistics",
  description:
    "Retrieve overall statistics for API logs including total requests, errors, average duration, and error rate. Requires x-api-key header for authentication.",
  tags,
  request: {
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("LogsStatsHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({
              total: z.number(),
              errors: z.number(),
              avgDuration: z.number().nullable(),
              minDuration: z.number().nullable(),
              maxDuration: z.number().nullable(),
              totalRequests24h: z.number(),
              errorRate: z.string(),
            })
            .openapi("LogsStatsResponse"),
        },
      },
      description: "API logs statistics",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const getEndpointMetricsRoute = createRoute({
  path: "/v1/logs/endpoint-metrics",
  method: "get",
  summary: "Get endpoint metrics",
  description:
    "Retrieve aggregated metrics for each endpoint including request counts, average duration, and error rates. Grouped by path and HTTP method. Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z
      .object({
        limit: z.coerce
          .number()
          .min(1)
          .max(100)
          .default(10)
          .optional()
          .describe("Maximum number of endpoints to return"),
      })
      .openapi("EndpointMetricsQuery"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("EndpointMetricsHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .array(
              z.object({
                path: z.string(),
                method: z.string(),
                totalRequests: z.number(),
                avgDuration: z.number().nullable(),
                minDuration: z.number().nullable(),
                maxDuration: z.number().nullable(),
                errorCount: z.number(),
                errorRate: z.string(),
              }),
            )
            .openapi("EndpointMetricsResponse"),
        },
      },
      description: "Endpoint metrics aggregated by path and method",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});

export const cleanupLogsRoute = createRoute({
  path: "/v1/logs/cleanup",
  method: "post",
  summary: "Clean up old API logs",
  description:
    "Delete API logs older than the specified retention period. Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z
      .object({
        daysToKeep: z.coerce
          .number()
          .min(1)
          .default(30)
          .optional()
          .describe("Number of days to keep logs (default: 30)"),
      })
      .openapi("CleanupLogsQuery"),
    headers: z
      .object({
        "x-api-key": z.string().describe("API key for logs access"),
      })
      .openapi("CleanupLogsHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({
              success: z.boolean(),
              message: z.string(),
              deletedCount: z.number(),
              timestamp: z.string(),
            })
            .openapi("CleanupLogsResponse"),
        },
      },
      description: "Logs cleaned up successfully",
    },
    400: {
      description: "Validation error",
    },
    401: {
      description: "Unauthorized - Invalid or missing API key",
    },
    500: {
      description: "Internal server error",
    },
  },
});
