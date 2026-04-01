import { CloudflareRateLimitStore } from "@/lib/cloudflare-rate-limit-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("CloudflareRateLimitStore", () => {
  let store: CloudflareRateLimitStore;

  beforeEach(() => {
    store = new CloudflareRateLimitStore();
    store.init({ windowMs: 60_000 });
  });

  it("should handle get operations", async () => {
    const key = "test-key";

    // Get a value that doesn't exist (should return undefined)
    const result = await store.get(key);
    expect(result).toBeUndefined();
  });

  it("should handle increment operations", async () => {
    const key = "test-key";

    // Increment a value (should return client info with totalHits = 1)
    const result = await store.increment(key);
    expect(result).toHaveProperty("totalHits", 1);
    expect(result).toHaveProperty("resetTime");
    expect(result.resetTime).toBeInstanceOf(Date);
  });

  it("should handle multiple increments", async () => {
    const key = "test-key";

    // Increment multiple times
    await store.increment(key);
    await store.increment(key);
    const result = await store.increment(key);

    expect(result.totalHits).toBe(3);
  });

  it("should handle get after increment", async () => {
    const key = "test-key";

    // Increment and then get
    await store.increment(key);
    const result = await store.get(key);

    expect(result).toBeDefined();
    expect(result?.totalHits).toBe(1);
  });

  it("should handle decrement operations", async () => {
    const key = "test-key";

    // Increment then decrement
    await store.increment(key);
    await store.increment(key);
    await store.decrement(key);

    const result = await store.get(key);
    expect(result?.totalHits).toBe(1);
  });

  it("should handle decrement on non-existent key (noop)", async () => {
    const key = "non-existent-key";

    // Decrement a non-existent key (should not throw)
    await expect(store.decrement(key)).resolves.toBeUndefined();
  });

  it("should not decrement expired entries (lazy cleanup)", async () => {
    const customStore = new CloudflareRateLimitStore();
    customStore.init({ windowMs: 100 }); // 100ms window

    const key = "expiring-decrement-key";

    // Increment to create an entry with totalHits = 2
    await customStore.increment(key);
    await customStore.increment(key);

    // Verify entry exists with totalHits = 2
    let result = await customStore.get(key);
    expect(result?.totalHits).toBe(2);

    // Wait for entry to expire
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Try to decrement expired entry (should be deleted, not decremented)
    await customStore.decrement(key);

    // Get should return undefined (entry was deleted, not decremented)
    result = await customStore.get(key);
    expect(result).toBeUndefined();
  });

  it("should handle resetKey operations", async () => {
    const key = "test-key-to-reset";

    // Increment and then reset
    await store.increment(key);
    await store.resetKey(key);

    const result = await store.get(key);
    expect(result).toBeUndefined();
  });

  it("should handle resetAll operations", async () => {
    const key1 = "test-key-1";
    const key2 = "test-key-2";

    // Increment multiple keys
    await store.increment(key1);
    await store.increment(key2);

    // Reset all
    await store.resetAll();

    // Verify all keys are cleared
    const result1 = await store.get(key1);
    const result2 = await store.get(key2);
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
  });

  it("should handle shutdown operations", async () => {
    const key = "test-key";

    // Increment and then shutdown
    await store.increment(key);
    await expect(store.shutdown()).resolves.toBeUndefined();

    // Verify data is cleared
    const result = await store.get(key);
    expect(result).toBeUndefined();
  });

  it("should handle init with custom windowMs", async () => {
    const customStore = new CloudflareRateLimitStore();
    customStore.init({ windowMs: 120_000 });

    const key = "test-key";
    const result = await customStore.increment(key);

    // ResetTime should be approximately 120 seconds from now
    const expectedResetTime = Date.now() + 120_000;
    const actualResetTime = result.resetTime!.getTime();

    // Allow for small timing differences (within 1 second)
    expect(Math.abs(actualResetTime - expectedResetTime)).toBeLessThan(1000);
  });

  describe("expiry and cleanup", () => {
    it("should return undefined for expired entries on get()", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 100 }); // 100ms window

      const key = "expiring-key";

      // Increment to create an entry
      await customStore.increment(key);

      // Wait for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Get should return undefined for expired entry
      const result = await customStore.get(key);
      expect(result).toBeUndefined();
    });

    it("should lazily cleanup expired entries on get()", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 100 }); // 100ms window

      const key = "lazy-cleanup-key";

      // Increment to create an entry
      await customStore.increment(key);

      // Verify entry exists
      let result = await customStore.get(key);
      expect(result).toBeDefined();

      // Wait for entry to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // First get should trigger lazy cleanup
      result = await customStore.get(key);
      expect(result).toBeUndefined();

      // Subsequent get should still return undefined
      result = await customStore.get(key);
      expect(result).toBeUndefined();
    });

    it("should run periodic cleanup after 100 requests", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 100 }); // 100ms window

      // Create multiple entries that will expire
      for (let i = 0; i < 10; i++) {
        await customStore.increment(`expired-key-${i}`);
      }

      // Wait for entries to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Create a new entry that won't expire
      await customStore.increment("active-key");

      // Trigger 99 more increments on the active key to reach cleanup threshold
      for (let i = 0; i < 99; i++) {
        await customStore.increment("active-key");
      }

      // After 100 increments total, periodic cleanup should have run
      // The expired entries should be cleaned up
      // We can't directly verify internal state, but we can verify that:
      // 1. Active key still works
      const activeResult = await customStore.get("active-key");
      expect(activeResult).toBeDefined();
      expect(activeResult?.totalHits).toBe(100);

      // 2. Expired entries return undefined
      const expiredResult = await customStore.get("expired-key-0");
      expect(expiredResult).toBeUndefined();
    });

    it("should not remove non-expired entries during cleanup", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 5000 }); // 5 second window

      const key1 = "active-key-1";
      const key2 = "active-key-2";

      // Create entries that won't expire
      await customStore.increment(key1);
      await customStore.increment(key2);

      // Trigger periodic cleanup by doing 100 increments
      for (let i = 0; i < 100; i++) {
        await customStore.increment(`trigger-${i}`);
      }

      // Verify non-expired entries still exist
      const result1 = await customStore.get(key1);
      const result2 = await customStore.get(key2);

      expect(result1).toBeDefined();
      expect(result1?.totalHits).toBe(1);
      expect(result2).toBeDefined();
      expect(result2?.totalHits).toBe(1);
    });

    it("should handle mixed expired and non-expired entries", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 100 }); // 100ms window

      // Create entries that will expire
      await customStore.increment("expired-1");
      await customStore.increment("expired-2");

      // Wait for first batch to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Create entries that won't expire
      await customStore.increment("active-1");
      await customStore.increment("active-2");

      // Check that expired entries return undefined
      expect(await customStore.get("expired-1")).toBeUndefined();
      expect(await customStore.get("expired-2")).toBeUndefined();

      // Check that active entries still exist
      expect(await customStore.get("active-1")).toBeDefined();
      expect(await customStore.get("active-2")).toBeDefined();
    });

    it("should cleanup expired entries during periodic batch cleanup", async () => {
      const customStore = new CloudflareRateLimitStore();
      customStore.init({ windowMs: 50 }); // 50ms window

      // Create 5 entries that will expire
      for (let i = 0; i < 5; i++) {
        await customStore.increment(`will-expire-${i}`);
      }

      // Wait for them to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create a fresh entry and trigger 99 more increments to trigger cleanup
      await customStore.increment("trigger-key");
      for (let i = 0; i < 99; i++) {
        await customStore.increment("trigger-key");
      }

      // After periodic cleanup runs (at 100 increments), expired entries should be gone
      // Verify by attempting to get them - they should return undefined
      for (let i = 0; i < 5; i++) {
        const result = await customStore.get(`will-expire-${i}`);
        expect(result).toBeUndefined();
      }

      // The trigger key should still be active
      const triggerResult = await customStore.get("trigger-key");
      expect(triggerResult).toBeDefined();
      expect(triggerResult?.totalHits).toBe(100);
    });
  });

  describe("performance characteristics", () => {
    it("should demonstrate O(1) performance for get() operations", async () => {
      const store1 = new CloudflareRateLimitStore();
      store1.init({ windowMs: 60_000 });

      const store2 = new CloudflareRateLimitStore();
      store2.init({ windowMs: 60_000 });

      // Populate store2 with 10,000 entries
      for (let i = 0; i < 10_000; i++) {
        await store2.increment(`key-${i}`);
      }

      // Measure get() performance with 1 entry
      const getKey1 = "test-key-1";
      await store1.increment(getKey1);

      const getStart1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        await store1.get(getKey1);
      }
      const getTime1 = performance.now() - getStart1;

      // Measure get() performance with 10,000 entries
      const getKey2 = "key-5000";

      const getStart2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        await store2.get(getKey2);
      }
      const getTime2 = performance.now() - getStart2;

      // get() should be O(1) - no cleanup, just lazy expiry check
      const getSpeedup = getTime2 / getTime1;

      // O(1) behavior: time should be roughly the same regardless of store size
      expect(getSpeedup).toBeLessThan(2);
    });

    it("should demonstrate amortized O(1) performance for increment() operations", async () => {
      const store1 = new CloudflareRateLimitStore();
      store1.init({ windowMs: 60_000 });

      const store2 = new CloudflareRateLimitStore();
      store2.init({ windowMs: 60_000 });

      // Populate store2 with 10,000 entries
      for (let i = 0; i < 10_000; i++) {
        await store2.increment(`key-${i}`);
      }

      // Measure increment() on small store (1 entry)
      const incStart1 = performance.now();
      for (let i = 0; i < 1000; i++) {
        await store1.increment("test-key");
      }
      const incTime1 = performance.now() - incStart1;

      // Measure increment() on large store (10,000 entries)
      // Note: This will trigger ~10 cleanups during measurement
      const incStart2 = performance.now();
      for (let i = 0; i < 1000; i++) {
        await store2.increment("inc-key");
      }
      const incTime2 = performance.now() - incStart2;

      const incSpeedup = incTime2 / incTime1;

      // increment() has amortized O(1) complexity due to periodic cleanup
      // With 10,000 entries and ~10 cleanups per 1000 ops, expect some slowdown
      // but much better than O(n) on every call (which would be ~10,000x)
      expect(incSpeedup).toBeLessThan(50); // Relaxed to account for periodic cleanup

      // Verify we're NOT seeing O(n) behavior on every call
      expect(incSpeedup).toBeLessThan(1000);
    });
  });
});
