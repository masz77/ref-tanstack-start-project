import type { MiddlewareHandler } from "hono";
import { ApiLogger } from "@/lib/api-logger";
import { createLogsService } from "@/routes/v1/logs/logs.service";
import type { AuthenticatedUser } from "./auth";

export function apiLoggingMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const startTime = new Date().toISOString();
    const method = c.req.method;
    const url = c.req.url;
    const path = new URL(url).pathname;

    // Skip logging for certain paths
    if (!ApiLogger.shouldLog(path, method)) {
      await next();
      return;
    }

    const logsService = createLogsService(c.env);

    // Capture request data
    const userAgent = c.req.header('user-agent');
    const ipAddress = ApiLogger.getIpAddress(c);
    
    // Get headers (excluding sensitive ones)
    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['authorization', 'cookie', 'x-api-key'].includes(lowerKey)) {
        headers[key] = value;
      }
    });

    // Get query parameters
    const queryParams: Record<string, string> = {};
    const urlObj = new URL(url);
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Get request body (if applicable)
    let requestBody: any = null;
    const contentType = c.req.header('content-type');
    
    if (method !== 'GET' && method !== 'HEAD' && contentType) {
      try {
        if (contentType.includes('application/json')) {
          // Clone the request to avoid consuming the stream
          const clonedReq = c.req.raw.clone();
          const bodyText = await clonedReq.text();
          if (bodyText) {
            requestBody = JSON.parse(bodyText);
            requestBody = ApiLogger.sanitizeRequestBody(requestBody);
          }
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          // For form data, we'll capture the keys but not values for privacy
          const clonedReq = c.req.raw.clone();
          const formData = await clonedReq.formData();
          const formObj: Record<string, string> = {};
          formData.forEach((_value, key) => {
            formObj[key] = '[FORM_DATA]';
          });
          requestBody = formObj;
        } else if (contentType.includes('multipart/form-data')) {
          requestBody = { type: 'multipart/form-data', message: '[FILE_UPLOAD]' };
        }
      } catch (error) {
        requestBody = { error: 'Failed to parse request body' };
      }
    }

    // Store original response methods to intercept
    let statusCode: number | undefined;
    let responseBody: any = null;
    let responseHeaders: Record<string, string> = {};
    let errorMessage: string | undefined;
    let errorStack: string | undefined;

    try {
      // Execute the request
      await next();

      // Capture response data
      statusCode = c.res.status;
      
      // Get response headers
      c.res.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (!['set-cookie', 'authorization'].includes(lowerKey)) {
          responseHeaders[key] = value;
        }
      });

      // Try to capture response body if it's JSON
      const responseContentType = c.res.headers.get('content-type');
      if (responseContentType?.includes('application/json')) {
        try {
          // Clone the response to avoid consuming it
          const clonedRes = c.res.clone();
          const responseText = await clonedRes.text();
          if (responseText) {
            responseBody = JSON.parse(responseText);
            responseBody = ApiLogger.sanitizeResponseBody(responseBody, statusCode);
          }
        } catch (error) {
          // If we can't parse the response, just note it
          responseBody = { message: '[UNPARSEABLE_RESPONSE]' };
        }
      } else if (responseContentType?.includes('text/')) {
        try {
          const clonedRes = c.res.clone();
          const responseText = await clonedRes.text();
          if (responseText && responseText.length < 1000) { // Only log short text responses
            responseBody = { text: responseText };
          } else {
            responseBody = { message: '[TEXT_RESPONSE]', length: responseText.length };
          }
        } catch (error) {
          responseBody = { message: '[TEXT_RESPONSE_ERROR]' };
        }
      } else {
        responseBody = { 
          message: '[NON_JSON_RESPONSE]', 
          contentType: responseContentType 
        };
      }

    } catch (error: any) {
      // Capture error information
      statusCode = 500; // Default error status
      errorMessage = error.message || 'Unknown error';
      errorStack = error.stack;
      
      // If it's an HTTP exception, get the actual status
      if (error.status) {
        statusCode = error.status;
      }

      // Re-throw the error to maintain normal error handling
      throw error;
    } finally {
      // Log the request/response data (async, don't wait)
      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
      
      // Get user context if available
      const user = c.get('user') as AuthenticatedUser | undefined;

      // Log asynchronously using the Workers execution context
      c.executionCtx?.waitUntil?.(ApiLogger.log(logsService, {
        method,
        url,
        path,
        userAgent,
        ipAddress,
        user,
        headers,
        queryParams,
        requestBody,
        statusCode,
        responseBody,
        responseHeaders,
        startTime,
        endTime,
        duration,
        errorMessage,
        errorStack,
      }));
    }
  };
} 
