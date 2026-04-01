import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

/**
 * Standard error response format
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: ValidationError[];
  timestamp: string;
  path: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  message: string,
  path: string,
  details?: ValidationError[],
): ErrorResponse {
  return {
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
    path,
  };
}

/**
 * Validation middleware for request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();
      const result = schema.safeParse(body);

      if (!result.success) {
        const details: ValidationError[] = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        throw new HTTPException(400, {
          message: JSON.stringify(
            createErrorResponse("VALIDATION_ERROR", "Request body validation failed", c.req.path, details),
          ),
        });
      }

      c.set("validatedBody", result.data);
      await next();
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(400, {
        message: JSON.stringify(createErrorResponse("INVALID_JSON", "Invalid JSON in request body", c.req.path)),
      });
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    const query = c.req.query();
    const result = schema.safeParse(query);

    if (!result.success) {
      const details: ValidationError[] = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      throw new HTTPException(400, {
        message: JSON.stringify(
          createErrorResponse("VALIDATION_ERROR", "Query parameters validation failed", c.req.path, details),
        ),
      });
    }

    c.set("validatedQuery", result.data);
    await next();
  };
}

/**
 * Validation middleware for path parameters
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    const params = c.req.param();
    const result = schema.safeParse(params);

    if (!result.success) {
      const details: ValidationError[] = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      throw new HTTPException(400, {
        message: JSON.stringify(
          createErrorResponse("VALIDATION_ERROR", "Path parameters validation failed", c.req.path, details),
        ),
      });
    }

    c.set("validatedParams", result.data);
    await next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: z.string().uuid("Invalid UUID format"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
  search: z.object({
    q: z.string().min(1).optional(),
    sort: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
};

/**
 * Workspace ID validation middleware
 */
export function validateWorkspaceAccess() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const workspaceId = c.req.param("workspaceId");

    if (!user?.workspace) {
      throw new HTTPException(403, {
        message: JSON.stringify(
          createErrorResponse("WORKSPACE_ACCESS_DENIED", "Workspace access required", c.req.path),
        ),
      });
    }

    if (workspaceId && user.workspace.id !== workspaceId) {
      throw new HTTPException(403, {
        message: JSON.stringify(
          createErrorResponse("WORKSPACE_MISMATCH", "Access denied to this workspace", c.req.path),
        ),
      });
    }

    await next();
  };
}

/**
 * Rate limiting validation
 */
export function validateRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const identifier = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    const now = Date.now();
    const userRequests = requests.get(identifier);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(identifier, { count: 1, resetTime: now + windowMs });
    } else {
      userRequests.count++;

      if (userRequests.count > maxRequests) {
        throw new HTTPException(429, {
          message: JSON.stringify(createErrorResponse("RATE_LIMIT_EXCEEDED", "Too many requests", c.req.path)),
        });
      }
    }

    await next();
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(options: {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}) {
  return async (c: Context, next: Next) => {
    const body = await c.req.parseBody();
    const file = body.file as File;

    if (options.required && !file) {
      throw new HTTPException(400, {
        message: JSON.stringify(createErrorResponse("FILE_REQUIRED", "File upload is required", c.req.path)),
      });
    }

    if (file) {
      if (options.maxSize && file.size > options.maxSize) {
        throw new HTTPException(400, {
          message: JSON.stringify(
            createErrorResponse("FILE_TOO_LARGE", `File size exceeds ${options.maxSize} bytes`, c.req.path),
          ),
        });
      }

      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        throw new HTTPException(400, {
          message: JSON.stringify(
            createErrorResponse("INVALID_FILE_TYPE", `File type ${file.type} not allowed`, c.req.path),
          ),
        });
      }
    }

    c.set("uploadedFile", file);
    await next();
  };
}
