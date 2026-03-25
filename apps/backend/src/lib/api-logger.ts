import type { Context } from "hono";

import type { LogData } from "@/routes/v1/logs/logs.service";
import type { createLogsService } from "@/routes/v1/logs/logs.service";

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
    const skipPaths = [
      "/health",
      "/doc",
      "/reference",
      "/favicon.ico",
      "/v1/logs",
    ];

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

  static log(logsService: LogsServiceInstance, data: LogData) {
    return logsService.addLog(data);
  }
}

export default ApiLogger;
