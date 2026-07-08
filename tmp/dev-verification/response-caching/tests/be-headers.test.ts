import { describe, expect, it } from "vitest";

import buildApp from "@/app";

// RED-first verification for the response-caching feature.
// Every assertion below MUST FAIL until the feature is implemented.
// This file lives under src/ so `bun run test` discovers it and the `@` alias
// resolves; it doubles as the promoted permanent test (RED now, GREEN later).
// Source of truth for expected values: tmp/dev-verification/response-caching/manifest.md

const CACHEABLE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const NO_STORE = "private, no-store";

// Real env — mirrors production bindings the app reads. No D1 binding, so DB-backed
// routes may 500; we assert headers only, which middleware sets regardless of status.
const TEST_ENV = {
  CORS_ORIGINS: "http://localhost:3000",
  BETTER_AUTH_SECRET: "verification-harness-secret",
  BETTER_AUTH_URL: "http://localhost:8787",
};

async function requestPath(path: string) {
  // Fresh app per request keeps the in-memory rate-limit store from accumulating.
  return buildApp().request(path, {}, TEST_ENV);
}

describe("response-caching: cache-control headers (RED until implemented)", () => {
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

describe("response-caching: cache-tag header (RED until implemented)", () => {
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

describe("response-caching: purge helper is runtime-guarded (RED until implemented)", () => {
  it("P-1 purgeCacheTags runs in a non-Cloudflare runtime without crashing", async () => {
    // Dynamic import so a missing module fails ONLY this case, not the header cases.
    const mod = await import("@/lib/cache");
    expect(typeof mod.purgeCacheTags).toBe("function");
    // Must resolve (no-op or error-return) — never throw from a static cloudflare:workers import.
    await expect(mod.purgeCacheTags(["verification-tag"], {})).resolves.not.toThrow();
  });
});
