import { createRoute, z } from "@hono/zod-openapi";
import { paginationSchema } from "@/lib/commonApiSchema";

// =============================================================================
// BASE LOGS SCHEMAS
// =============================================================================

// Base API log schema mapped from database structure
const baseApiLogSchema = z.object({
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
}).openapi("BaseApiLog");

// =============================================================================
// RESPONSE SCHEMAS (extending base with computed fields)
// =============================================================================

// Log item response schema - essential fields for list views
export const logItemResponseSchema = z.object({
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
}).openapi("LogItem");

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

const logsByPathResponseSchema = z.object({
  data: z.array(logItemResponseSchema),
  pagination: paginationSchema,
  summary: z.object({
    path: z.string(),
    totalRequests: z.number(),
    method: z.string().optional(),
    statusCode: z.number().optional(),
  }),
}).openapi("LogsByPathResponse");

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

const tags = ["Logs"];

export const getLogByIdRoute = createRoute({
  path: "/v1/logs/{id}",
  method: "get",
  summary: "Get API log details",
  description: "Retrieve detailed information for a specific API log entry. Requires x-api-key header for authentication.",
  tags,
  request: {
    params: z.object({
      id: z.string().uuid(),
    }).openapi("LogParams"),
    headers: z.object({
      "x-api-key": z.string().describe("API key for logs access"),
    }).openapi("LogHeaders"),
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
  description: "Retrieve API logs filtered by a specific path with enhanced performance optimization. Requires x-api-key header for authentication.",
  tags,
  request: {
    query: z.object({
      path: z.string().describe("The exact path to filter logs by (e.g., '/v1/auth/signin')"),
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(20).optional(),
      method: z.string().optional().describe("HTTP method filter"),
      statusCode: z.coerce.number().optional().describe("HTTP status code filter"),
      fromDate: z.string().datetime().optional().describe("Filter logs from this date"),
      toDate: z.string().datetime().optional().describe("Filter logs to this date"),
    }).openapi("LogsByPathQuery"),
    headers: z.object({
      "x-api-key": z.string().describe("API key for logs access"),
    }).openapi("LogsByPathHeaders"),
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
  description: "A simple endpoint to test if the x-api-key header is valid. Returns success message if API key is correct.",
  tags,
  request: {
    headers: z.object({
      "x-api-key": z.string().describe("API key for logs access"),
    }).openapi("TestApiKeyHeaders"),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            timestamp: z.string(),
          }).openapi("TestApiKeyResponse"),
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

// =============================================================================
// ROUTER ASSEMBLY
// =============================================================================

import { createRouter } from "@/lib/create-app";
import * as handlers from "./logs.controller";

export const logsRouter = createRouter()
  .openapi(getLogsByPathRoute, handlers.getLogsByPath)
  .openapi(testApiKeyRoute, handlers.testConnection)
  .openapi(getLogByIdRoute, handlers.getLogById);

// Export router as default for backward compatibility during migration
export default logsRouter; 