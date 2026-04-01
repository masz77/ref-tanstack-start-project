import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ErrorResponse } from "./validation";

/**
 * Global error handling middleware
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      // Handle HTTP exceptions
      let errorResponse: ErrorResponse;

      try {
        // Try to parse the message as JSON (from validation middleware)
        errorResponse = JSON.parse(error.message);
      } catch {
        // If not JSON, create standard error response
        errorResponse = {
          error: getErrorCode(error.status),
          message: error.message,
          timestamp: new Date().toISOString(),
          path: c.req.path,
        };
      }

      return c.json(errorResponse, error.status);
    }

    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      error: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      timestamp: new Date().toISOString(),
      path: c.req.path,
    };

    return c.json(errorResponse, 500);
  }
}

/**
 * Get error code based on HTTP status
 */
function getErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "UNPROCESSABLE_ENTITY";
    case 429:
      return "TOO_MANY_REQUESTS";
    case 500:
      return "INTERNAL_SERVER_ERROR";
    default:
      return "UNKNOWN_ERROR";
  }
}

/**
 * Not found handler
 */
export function notFoundHandler(c: Context) {
  const errorResponse: ErrorResponse = {
    error: "NOT_FOUND",
    message: `Route ${c.req.method} ${c.req.path} not found`,
    timestamp: new Date().toISOString(),
    path: c.req.path,
  };

  return c.json(errorResponse, 404);
}
