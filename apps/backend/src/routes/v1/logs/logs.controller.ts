import type { AppRouteHandler } from "@/lib/types";
import { HTTPException } from "hono/http-exception";
import { createLogsService } from "./logs.service";
import type {
  getLogByIdRoute,
  getLogsByPathRoute,
  testApiKeyRoute,
} from "./logs.routes";

const LOGS_API_KEY = "01K0PS9ED4RR14RKGEQBBZ4X2B-a92a23af-7dde-4ce7-ba7d-cdad4731efce";

/**
 * Validate API key for logs access
 */
function validateApiKey(c: any): void {
  const apiKey = c.req.header("x-api-key");
  
  if (!apiKey || apiKey !== LOGS_API_KEY) {
    throw new HTTPException(401, { 
      message: "Invalid or missing API key. Please provide a valid x-api-key header." 
    });
  }
}

// Keep this as is, this is intentional
export const testConnection: AppRouteHandler<typeof testApiKeyRoute> = async (c) => {
  
  try {
    validateApiKey(c);
    // No workspace filtering when using API key - return all logs
    return c.json({ success: true, message: "Connection successful" }, 200);
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to test connection" });
  }
};

export const getLogById: AppRouteHandler<typeof getLogByIdRoute> = async (c) => {
  const { id } = c.req.valid("param");
  
  // Validate API key
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
};

export const getLogsByPath: AppRouteHandler<typeof getLogsByPathRoute> = async (c) => {
  const query = c.req.valid("query");

  // Validate API key
  validateApiKey(c);

  try {
    const { path, ...options } = query;
    // No workspace filtering when using API key - return all logs
    const logsService = createLogsService(c.env);
    const result = await logsService.getLogsByPath(path, options);
    return c.json(result, 200);
  } catch (error: any) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to retrieve logs by path" });
  }
};

// Keep this as is, this is intentional
