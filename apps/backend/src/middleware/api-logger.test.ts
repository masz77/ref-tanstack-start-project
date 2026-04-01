import { ApiLogger } from "@/lib/api-logger";
import { describe, expect, it } from "vitest";

describe("ApiLogger - Deferred Body Processing", () => {
  describe("parseRequestBody", () => {
    it("should parse JSON request body and sanitize", async () => {
      const body = {
        username: "testuser",
        password: "secret123",
        email: "test@example.com",
      };
      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await ApiLogger.parseRequestBody(request, "application/json");

      expect(result).toEqual({
        username: "testuser",
        password: "[REDACTED]",
        email: "test@example.com",
      });
    });

    it("should handle empty JSON body", async () => {
      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "",
      });

      const result = await ApiLogger.parseRequestBody(request, "application/json");

      expect(result).toBeNull();
    });

    it("should handle form-urlencoded content type", async () => {
      const formData = new URLSearchParams();
      formData.append("username", "testuser");
      formData.append("password", "secret123");

      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const result = await ApiLogger.parseRequestBody(request, "application/x-www-form-urlencoded");

      expect(result).toEqual({
        username: "[FORM_DATA]",
        password: "[FORM_DATA]",
      });
    });

    it("should handle multipart form data", async () => {
      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "multipart/form-data" },
      });

      const result = await ApiLogger.parseRequestBody(request, "multipart/form-data");

      expect(result).toEqual({
        type: "multipart/form-data",
        message: "[FILE_UPLOAD]",
      });
    });

    it("should handle invalid JSON gracefully", async () => {
      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "invalid json {",
      });

      const result = await ApiLogger.parseRequestBody(request, "application/json");

      expect(result).toEqual({
        error: "Failed to parse request body",
      });
    });

    it("should return null for unknown content types", async () => {
      const request = new Request("http://example.com", {
        method: "POST",
        headers: { "content-type": "text/plain" },
      });

      const result = await ApiLogger.parseRequestBody(request, "text/plain");

      expect(result).toBeNull();
    });
  });

  describe("parseResponseBody", () => {
    it("should parse JSON response body and sanitize", async () => {
      const body = {
        success: true,
        data: { id: 1, token: "secret-token" },
      };
      const response = new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      });

      const result = await ApiLogger.parseResponseBody(response, "application/json", 200);

      expect(result).toEqual({
        success: true,
        data: { id: 1, token: "[REDACTED]" },
      });
    });

    it("should handle large response bodies", async () => {
      const largeBody = {
        data: "x".repeat(60000),
      };
      const response = new Response(JSON.stringify(largeBody), {
        headers: { "content-type": "application/json" },
      });

      const result = await ApiLogger.parseResponseBody(response, "application/json", 200);

      expect(result).toHaveProperty("message", "[RESPONSE TOO LARGE]");
      expect(result).toHaveProperty("statusCode", 200);
      expect(result).toHaveProperty("size");
    });

    it("should handle unparseable JSON response", async () => {
      const response = new Response("invalid json {", {
        headers: { "content-type": "application/json" },
      });

      const result = await ApiLogger.parseResponseBody(response, "application/json");

      expect(result).toEqual({
        message: "[UNPARSEABLE_RESPONSE]",
      });
    });

    it("should handle short text responses", async () => {
      const response = new Response("OK", {
        headers: { "content-type": "text/plain" },
      });

      const result = await ApiLogger.parseResponseBody(response, "text/plain");

      expect(result).toEqual({
        text: "OK",
      });
    });

    it("should handle long text responses", async () => {
      const longText = "x".repeat(2000);
      const response = new Response(longText, {
        headers: { "content-type": "text/html" },
      });

      const result = await ApiLogger.parseResponseBody(response, "text/html");

      expect(result).toEqual({
        message: "[TEXT_RESPONSE]",
        length: 2000,
      });
    });

    it("should handle non-JSON, non-text responses", async () => {
      const response = new Response("binary data", {
        headers: { "content-type": "application/octet-stream" },
      });

      const result = await ApiLogger.parseResponseBody(response, "application/octet-stream");

      expect(result).toEqual({
        message: "[NON_JSON_RESPONSE]",
        contentType: "application/octet-stream",
      });
    });

    it("should handle empty JSON response", async () => {
      const response = new Response("", {
        headers: { "content-type": "application/json" },
      });

      const result = await ApiLogger.parseResponseBody(response, "application/json");

      expect(result).toBeNull();
    });

    it("should handle text response error", async () => {
      // Create a response that will fail during text extraction
      const response = new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("Stream error"));
          },
        }),
        {
          headers: { "content-type": "text/plain" },
        },
      );

      const result = await ApiLogger.parseResponseBody(response, "text/plain");

      expect(result).toEqual({
        message: "[TEXT_RESPONSE_ERROR]",
      });
    });
  });

  describe("sanitizeRequestBody", () => {
    it("should redact sensitive fields", () => {
      const body = {
        username: "testuser",
        password: "secret",
        email: "test@example.com",
        apiKey: "key123",
      };

      const result = ApiLogger.sanitizeRequestBody(body);

      expect(result).toEqual({
        username: "testuser",
        password: "[REDACTED]",
        email: "test@example.com",
        apiKey: "[REDACTED]",
      });
    });

    it("should handle nested objects", () => {
      const body = {
        user: {
          name: "test",
          credentials: {
            password: "secret",
            token: "abc123",
          },
        },
      };

      const result = ApiLogger.sanitizeRequestBody(body);

      expect(result).toEqual({
        user: {
          name: "test",
          credentials: {
            password: "[REDACTED]",
            token: "[REDACTED]",
          },
        },
      });
    });

    it("should handle arrays", () => {
      const body = {
        users: [
          { name: "user1", password: "pass1" },
          { name: "user2", password: "pass2" },
        ],
      };

      const result = ApiLogger.sanitizeRequestBody(body);

      expect(result).toEqual({
        users: [
          { name: "user1", password: "[REDACTED]" },
          { name: "user2", password: "[REDACTED]" },
        ],
      });
    });

    it("should handle case-insensitive field matching", () => {
      const body = {
        Password: "secret",
        API_KEY: "key123",
        AccessToken: "token",
      };

      const result = ApiLogger.sanitizeRequestBody(body);

      expect(result).toEqual({
        Password: "[REDACTED]",
        API_KEY: "[REDACTED]",
        AccessToken: "[REDACTED]",
      });
    });

    it("should handle primitive values", () => {
      expect(ApiLogger.sanitizeRequestBody("string")).toBe("string");
      expect(ApiLogger.sanitizeRequestBody(123)).toBe(123);
      expect(ApiLogger.sanitizeRequestBody(true)).toBe(true);
      expect(ApiLogger.sanitizeRequestBody(null)).toBe(null);
      expect(ApiLogger.sanitizeRequestBody(undefined)).toBe(undefined);
    });
  });

  describe("sanitizeResponseBody", () => {
    it("should sanitize response body", () => {
      const body = {
        success: true,
        data: {
          id: 1,
          accessToken: "secret-token",
        },
      };

      const result = ApiLogger.sanitizeResponseBody(body, 200);

      expect(result).toEqual({
        success: true,
        data: {
          id: 1,
          accessToken: "[REDACTED]",
        },
      });
    });

    it("should truncate large responses", () => {
      const largeBody = {
        data: "x".repeat(60000),
      };

      const result = ApiLogger.sanitizeResponseBody(largeBody, 200);

      expect(result).toHaveProperty("message", "[RESPONSE TOO LARGE]");
      expect(result).toHaveProperty("statusCode", 200);
      expect(result).toHaveProperty("size");
    });

    it("should handle non-object responses", () => {
      expect(ApiLogger.sanitizeResponseBody("string", 200)).toBe("string");
      expect(ApiLogger.sanitizeResponseBody(123, 200)).toBe(123);
      expect(ApiLogger.sanitizeResponseBody(null, 200)).toBe(null);
    });
  });

  describe("shouldLog", () => {
    it("should skip health check endpoint", () => {
      expect(ApiLogger.shouldLog("/health", "GET")).toBe(false);
    });

    it("should skip documentation endpoints", () => {
      expect(ApiLogger.shouldLog("/doc", "GET")).toBe(false);
      expect(ApiLogger.shouldLog("/reference", "GET")).toBe(false);
    });

    it("should skip logs endpoint", () => {
      expect(ApiLogger.shouldLog("/v1/logs", "GET")).toBe(false);
    });

    it("should skip OPTIONS requests", () => {
      expect(ApiLogger.shouldLog("/api/users", "OPTIONS")).toBe(false);
    });

    it("should log regular API endpoints", () => {
      expect(ApiLogger.shouldLog("/v1/users", "GET")).toBe(true);
      expect(ApiLogger.shouldLog("/v1/posts", "POST")).toBe(true);
      expect(ApiLogger.shouldLog("/api/data", "PUT")).toBe(true);
    });
  });

  describe("getIpAddress", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === "x-forwarded-for") return "192.168.1.1, 10.0.0.1";
            return null;
          },
        },
      } as any;

      expect(ApiLogger.getIpAddress(mockContext)).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === "x-real-ip") return "192.168.1.2";
            return null;
          },
        },
      } as any;

      expect(ApiLogger.getIpAddress(mockContext)).toBe("192.168.1.2");
    });

    it("should extract IP from cf-connecting-ip header", () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === "cf-connecting-ip") return "192.168.1.3";
            return null;
          },
        },
      } as any;

      expect(ApiLogger.getIpAddress(mockContext)).toBe("192.168.1.3");
    });

    it("should return 'unknown' if no IP headers present", () => {
      const mockContext = {
        req: {
          header: () => null,
        },
      } as any;

      expect(ApiLogger.getIpAddress(mockContext)).toBe("unknown");
    });

    it("should prioritize x-forwarded-for over other headers", () => {
      const mockContext = {
        req: {
          header: (name: string) => {
            if (name === "x-forwarded-for") return "192.168.1.1";
            if (name === "x-real-ip") return "192.168.1.2";
            if (name === "cf-connecting-ip") return "192.168.1.3";
            return null;
          },
        },
      } as any;

      expect(ApiLogger.getIpAddress(mockContext)).toBe("192.168.1.1");
    });
  });
});
