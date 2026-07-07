import { describe, expect, it } from "vitest";

import buildApp from "@/app";
import { CACHEABLE, NO_STORE } from "@/lib/cache-control";

// Integration contract for the response-caching feature: the cache-control middleware
// stamps the right headers on the real route table. Assertions are header-only, so
// DB-backed routes may 500 without a D1 binding — the middleware runs regardless of status.

// Real env — mirrors production bindings the app reads.
const TEST_ENV = {
  CORS_ORIGINS: "http://localhost:3000",
  BETTER_AUTH_SECRET: "verification-harness-secret",
  BETTER_AUTH_URL: "http://localhost:8787",
};

// One app for the whole file — these ~11 GETs stay well under the 100/window rate limit.
const app = buildApp();

function requestPath(path: string) {
  return app.request(path, {}, TEST_ENV);
}

describe("response-caching: cache-control headers", () => {
  it("BE-1 GET / is cacheable", async () => {
    const res = await requestPath("/");
    expect(res.headers.get("cache-control")).toBe(CACHEABLE);
  });

  it("BE-2 GET /doc is cacheable", async () => {
    const res = await requestPath("/doc");
    expect(res.headers.get("cache-control")).toBe(CACHEABLE);
  });

  it("BE-3 GET /reference is cacheable", async () => {
    const res = await requestPath("/reference");
    expect(res.headers.get("cache-control")).toBe(CACHEABLE);
  });

  it("BE-4 GET /health is no-store", async () => {
    const res = await requestPath("/health");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
  });

  it("BE-5 GET /test is no-store (header only; route may 500 without D1)", async () => {
    const res = await requestPath("/test");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
  });

  it("BE-6 GET /api/session is no-store", async () => {
    const res = await requestPath("/api/session");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
  });

  it("BE-7 GET /api/auth/ok is no-store", async () => {
    const res = await requestPath("/api/auth/ok");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
  });
});

describe("response-caching: cache-tag header", () => {
  it("BE-8 cacheable routes carry a non-empty cache-tag; /health does not", async () => {
    for (const path of ["/", "/doc", "/reference"]) {
      const res = await requestPath(path);
      const tag = res.headers.get("cache-tag");
      expect(tag, `cache-tag on ${path}`).toBeTruthy();
    }
    const health = await requestPath("/health");
    expect(health.headers.get("cache-tag"), "cache-tag on /health").toBeNull();
  });
});

describe("response-caching: purge helper is runtime-guarded", () => {
  it("P-1 purgeCacheTags runs in a non-Cloudflare runtime without crashing", async () => {
    // Dynamic import so a missing module fails ONLY this case, not the header cases.
    const mod = await import("@/lib/cache");
    expect(typeof mod.purgeCacheTags).toBe("function");
    // Must resolve (no-op or error-return) — never throw from a static cloudflare:workers import.
    await expect(mod.purgeCacheTags(["verification-tag"])).resolves.not.toThrow();
  });
});
