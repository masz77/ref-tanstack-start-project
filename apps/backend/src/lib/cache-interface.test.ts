import { describe, it, expect, beforeEach, vi } from "vitest";
import { CacheService } from "@/lib/cache";

// Mock implementation for testing
class MockCacheService implements CacheService {
  private store: Map<string, { value: string; expiresAt?: number }> = new Map();
  
  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expiresAt });
  }
  
  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }
  
  async flushAll(): Promise<void> {
    this.store.clear();
  }
}

describe("Cache Service Interface", () => {
  let cache: CacheService;
  
  beforeEach(() => {
    cache = new MockCacheService();
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
    await new Promise(resolve => setTimeout(resolve, 1100));
    
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
});