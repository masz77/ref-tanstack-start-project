import { type CacheService, createCacheService } from "@/infrastructure/cache";
import type { KVNamespace } from "@cloudflare/workers-types";
import { beforeEach, describe, expect, it } from "vitest";

// Mock KVNamespace implementation for testing
class MockKVNamespace {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();

  async get(key: string, options?: any): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ keys: Array<{ name: string }>; list_complete: true; cacheStatus: null }> {
    const keys = Array.from(this.store.keys()).map((name) => ({ name }));
    return { keys, list_complete: true, cacheStatus: null };
  }
}

describe("Cache Service (KV-backed)", () => {
  let cache: CacheService;
  let mockKV: MockKVNamespace;

  beforeEach(() => {
    mockKV = new MockKVNamespace();
    cache = createCacheService({ KV: mockKV as unknown as KVNamespace });
  });

  it("should handle get/set operations", async () => {
    const key = "test-key";
    const value = "test-value";

    // Set a value
    await cache.set(key, value);

    // Get the value
    const result = await cache.get(key);
    expect(result).toBe(value);
  });

  it("should return null for non-existent keys", async () => {
    const key = "non-existent-key";

    // Get a non-existent key
    const result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("should handle delete operations", async () => {
    const key = "test-key-to-delete";
    const value = "test-value";

    // Set a value
    await cache.set(key, value);

    // Verify it exists
    let result = await cache.get(key);
    expect(result).toBe(value);

    // Delete the value
    await cache.del(key);

    // Verify it's deleted
    result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("should handle TTL (time to live)", async () => {
    const key = "test-ttl-key";
    const value = "test-ttl-value";

    // Set a value with 1 second TTL
    await cache.set(key, value, 1);

    // Verify it exists immediately
    let result = await cache.get(key);
    expect(result).toBe(value);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Verify it's expired
    result = await cache.get(key);
    expect(result).toBeNull();
  });

  it("should handle exists check", async () => {
    const key = "test-exists-key";
    const value = "test-exists-value";

    // Check non-existent key
    let exists = await cache.exists(key);
    expect(exists).toBe(false);

    // Set a value
    await cache.set(key, value);

    // Check existing key
    exists = await cache.exists(key);
    expect(exists).toBe(true);
  });

  it("should handle exists check with expired keys", async () => {
    const key = "test-expired-exists-key";
    const value = "test-value";

    // Set a value with 1 second TTL
    await cache.set(key, value, 1);

    // Check it exists immediately
    let exists = await cache.exists(key);
    expect(exists).toBe(true);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Verify it no longer exists
    exists = await cache.exists(key);
    expect(exists).toBe(false);
  });

  it("should handle flushAll operations", async () => {
    // Set multiple values
    await cache.set("key1", "value1");
    await cache.set("key2", "value2");
    await cache.set("key3", "value3");

    // Verify they exist
    expect(await cache.exists("key1")).toBe(true);
    expect(await cache.exists("key2")).toBe(true);
    expect(await cache.exists("key3")).toBe(true);

    // Flush all
    await cache.flushAll();

    // Verify all are deleted
    expect(await cache.exists("key1")).toBe(false);
    expect(await cache.exists("key2")).toBe(false);
    expect(await cache.exists("key3")).toBe(false);
  });

  it("should throw error when KV binding is not configured", () => {
    expect(() => createCacheService({})).toThrow("KV namespace binding is not configured.");
  });
});
