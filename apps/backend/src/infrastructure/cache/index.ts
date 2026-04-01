import type { KVNamespace } from "@cloudflare/workers-types";

// Define the cache interface
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flushAll(): Promise<void>;
}

export interface Env {
  KV?: KVNamespace;
}

class KVCacheService implements CacheService {
  constructor(private readonly kv: KVNamespace) {}

  async get(key: string): Promise<string | null> {
    return await this.kv.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const options = ttl ? { expirationTtl: ttl } : undefined;
    await this.kv.put(key, value, options);
  }

  async del(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }

  async flushAll(): Promise<void> {
    // KV doesn't support atomic flush, so we list and delete all keys
    // This is expensive and should be used sparingly
    const list = await this.kv.list();
    await Promise.all(list.keys.map((key) => this.kv.delete(key.name)));
  }
}

export function createCacheService(env: Env): CacheService {
  if (!env.KV) {
    throw new Error("KV namespace binding is not configured.");
  }
  return new KVCacheService(env.KV);
}

export default createCacheService;
