import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { describe, expect, it } from "vitest";

import { CACHEABLE, cacheControlMiddleware, NO_STORE } from "@/lib/cache-control";

// Unit tests for the toggle and the gating that the integration contract
// (cache-control.verification.test.ts) can't exercise: method, Origin, status.

function appWithRoot(enabled: boolean, status: ContentfulStatusCode = 200) {
  const app = new Hono();
  app.use(cacheControlMiddleware(enabled));
  app.all("/", (c) => c.text("ok", status));
  app.get("/docs-foo", (c) => c.text("ok"));
  return app;
}

describe("cacheControlMiddleware", () => {
  it("stamps the cacheable header + tag on a GET of an allowlisted path", async () => {
    const res = await appWithRoot(true).request("/");
    expect(res.headers.get("cache-control")).toBe(CACHEABLE);
    expect(res.headers.get("cache-tag")).toBe("static,api-index");
  });

  it("stamps NO headers when disabled", async () => {
    const res = await appWithRoot(false).request("/");
    expect(res.headers.get("cache-control")).toBeNull();
    expect(res.headers.get("cache-tag")).toBeNull();
  });

  it("uses exact-path matching — /docs-foo does not match /doc", async () => {
    const res = await appWithRoot(true).request("/docs-foo");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    expect(res.headers.get("cache-tag")).toBeNull();
  });

  it("falls to no-store on a non-2xx response for an allowlisted path", async () => {
    const res = await appWithRoot(true, 429).request("/");
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    expect(res.headers.get("cache-tag")).toBeNull();
  });

  it("falls to no-store on a non-GET (OPTIONS preflight) of an allowlisted path", async () => {
    const res = await appWithRoot(true).request("/", { method: "OPTIONS" });
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    expect(res.headers.get("cache-tag")).toBeNull();
  });

  it("falls to no-store when the request carries an Origin (CORS taint)", async () => {
    const res = await appWithRoot(true).request("/", {
      headers: { origin: "http://evil.example" },
    });
    expect(res.headers.get("cache-control")).toBe(NO_STORE);
    expect(res.headers.get("cache-tag")).toBeNull();
  });
});
