import type { Context } from "hono";

import type { LogData } from "@/features/logs/service";
import type { createLogsService } from "@/features/logs/service";

type LogsServiceInstance = ReturnType<typeof createLogsService>;

const SENSITIVE_FIELDS = [
  "password",
  "confirmPassword",
  "currentPassword",
  "newPassword",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "privateKey",
  "ssn",
  "socialSecurityNumber",
  "creditCard",
  "cardNumber",
  "cvv",
  "pin",
];

function sanitizeObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, innerValue]) => {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
        return [key, "[REDACTED]"];
      }
      return [key, sanitizeObject(innerValue)];
    });

    return Object.fromEntries(entries);
  }

  return value;
}

export class ApiLogger {
  static shouldLog(path: string, method: string) {
    const skipPaths = ["/health", "/doc", "/reference", "/favicon.ico", "/v1/logs"];

    if (method === "OPTIONS") {
      return false;
    }

    return !skipPaths.some((prefix) => path.startsWith(prefix));
  }

  static getIpAddress(c: Context) {
    const forwarded = c.req.header("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    const realIp = c.req.header("x-real-ip");
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = c.req.header("cf-connecting-ip");
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return "unknown";
  }

  static sanitizeRequestBody(body: unknown) {
    return sanitizeObject(body);
  }

  static sanitizeResponseBody(body: unknown, statusCode?: number) {
    if (!body || typeof body !== "object") {
      return body;
    }

    const serialized = JSON.stringify(body);
    if (serialized.length > 50000) {
      return {
        message: "[RESPONSE TOO LARGE]",
        size: serialized.length,
        statusCode,
      };
    }

    return sanitizeObject(body);
  }

  static async parseRequestBody(clonedRequest: Request, contentType: string): Promise<unknown> {
    try {
      if (contentType.includes("application/json")) {
        const bodyText = await clonedRequest.text();
        if (bodyText) {
          const requestBody = JSON.parse(bodyText);
          return ApiLogger.sanitizeRequestBody(requestBody);
        }
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        // For form data, we'll capture the keys but not values for privacy
        const formData = await clonedRequest.formData();
        const formObj: Record<string, string> = {};
        formData.forEach((_value, key) => {
          formObj[key] = "[FORM_DATA]";
        });
        return formObj;
      } else if (contentType.includes("multipart/form-data")) {
        return { type: "multipart/form-data", message: "[FILE_UPLOAD]" };
      }
    } catch (error) {
      return { error: "Failed to parse request body" };
    }

    return null;
  }

  static async parseResponseBody(
    clonedResponse: Response,
    responseContentType: string,
    statusCode?: number,
  ): Promise<unknown> {
    if (responseContentType.includes("application/json")) {
      try {
        const responseText = await clonedResponse.text();
        if (responseText) {
          const responseBody = JSON.parse(responseText);
          return ApiLogger.sanitizeResponseBody(responseBody, statusCode);
        }
      } catch (error) {
        // If we can't parse the response, just note it
        return { message: "[UNPARSEABLE_RESPONSE]" };
      }
    } else if (responseContentType.includes("text/")) {
      try {
        const responseText = await clonedResponse.text();
        if (responseText && responseText.length < 1000) {
          // Only log short text responses
          return { text: responseText };
        } else {
          return { message: "[TEXT_RESPONSE]", length: responseText.length };
        }
      } catch (error) {
        return { message: "[TEXT_RESPONSE_ERROR]" };
      }
    } else {
      return {
        message: "[NON_JSON_RESPONSE]",
        contentType: responseContentType,
      };
    }

    return null;
  }

  static log(logsService: LogsServiceInstance, data: LogData) {
    return logsService.addLog(data);
  }
}

export default ApiLogger;
