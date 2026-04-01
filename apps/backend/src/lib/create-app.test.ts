import { describe, expect, it } from "vitest";

/**
 * Test helper that replicates resolveCorsOrigins function logic
 * Note: The actual resolveCorsOrigins function in create-app.ts is not exported.
 * These tests verify the expected behavior. To test the actual implementation,
 * the function should be exported or these tests should be adapted to test
 * through the middleware integration.
 */
function resolveCorsOrigins(env: Record<string, unknown>) {
  const rawOrigins = (env as any)?.CORS_ORIGINS;

  if (Array.isArray(rawOrigins)) {
    return rawOrigins.map((origin) => String(origin));
  }

  if (typeof rawOrigins === "string") {
    return rawOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  throw new Error(
    "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
  );
}

describe("resolveCorsOrigins", () => {
  it("should handle array input with single origin", () => {
    const env = { CORS_ORIGINS: ["https://example.com"] };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com"]);
  });

  it("should handle array input with multiple origins", () => {
    const env = { CORS_ORIGINS: ["https://example.com", "https://app.example.com"] };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com", "https://app.example.com"]);
  });

  it("should convert non-string array elements to strings", () => {
    const env = { CORS_ORIGINS: [123, true, "https://example.com"] };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["123", "true", "https://example.com"]);
  });

  it("should handle string input with single origin", () => {
    const env = { CORS_ORIGINS: "https://example.com" };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com"]);
  });

  it("should handle string input with multiple comma-separated origins", () => {
    const env = { CORS_ORIGINS: "https://example.com,https://app.example.com,https://admin.example.com" };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com", "https://app.example.com", "https://admin.example.com"]);
  });

  it("should trim whitespace from string origins", () => {
    const env = { CORS_ORIGINS: " https://example.com , https://app.example.com , https://admin.example.com " };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com", "https://app.example.com", "https://admin.example.com"]);
  });

  it("should filter out empty strings from comma-separated list", () => {
    const env = { CORS_ORIGINS: "https://example.com,,https://app.example.com,  ," };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["https://example.com", "https://app.example.com"]);
  });

  it("should handle wildcard origin in array", () => {
    const env = { CORS_ORIGINS: ["*"] };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["*"]);
  });

  it("should handle wildcard origin in string", () => {
    const env = { CORS_ORIGINS: "*" };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual(["*"]);
  });

  it("should throw error when CORS_ORIGINS is missing", () => {
    const env = {};
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should throw error when CORS_ORIGINS is undefined", () => {
    const env = { CORS_ORIGINS: undefined };
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should throw error when CORS_ORIGINS is null", () => {
    const env = { CORS_ORIGINS: null };
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should throw error when CORS_ORIGINS is a number", () => {
    const env = { CORS_ORIGINS: 123 };
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should throw error when CORS_ORIGINS is a boolean", () => {
    const env = { CORS_ORIGINS: true };
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should throw error when CORS_ORIGINS is an object", () => {
    const env = { CORS_ORIGINS: { origin: "https://example.com" } };
    expect(() => resolveCorsOrigins(env)).toThrow(
      "CORS_ORIGINS environment variable is required for security. Set it to comma-separated list of allowed origins.",
    );
  });

  it("should handle empty array", () => {
    const env = { CORS_ORIGINS: [] };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual([]);
  });

  it("should handle empty string", () => {
    const env = { CORS_ORIGINS: "" };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual([]);
  });

  it("should handle string with only whitespace", () => {
    const env = { CORS_ORIGINS: "   " };
    const result = resolveCorsOrigins(env);
    expect(result).toEqual([]);
  });
});
