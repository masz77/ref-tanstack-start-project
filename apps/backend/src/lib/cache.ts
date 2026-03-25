// Define the cache interface
export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flushAll(): Promise<void>;
}

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

let warningChecked = false;

function ensureWarning() {
  if (warningChecked) {
    return;
  }

  const redisUrl = (() => {
    if (typeof process !== "undefined" && process.env?.REDIS_URL) {
      return process.env.REDIS_URL;
    }
    if (typeof globalThis !== "undefined" && (globalThis as any)?.REDIS_URL) {
      return (globalThis as any).REDIS_URL as string;
    }
    return undefined;
  })();

  if (redisUrl) {
    console.warn("REDIS_URL is defined, but Redis is not supported in Cloudflare Workers. Falling back to in-memory cache.");
  }

  warningChecked = true;
}

class InMemoryCacheService implements CacheService {
  private readonly store = new Map<string, CacheEntry>();

  async get(key: string): Promise<string | null> {
    ensureWarning();
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    ensureWarning();
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    ensureWarning();
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    ensureWarning();
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  async flushAll(): Promise<void> {
    ensureWarning();
    this.store.clear();
  }
}

export const cache: CacheService = new InMemoryCacheService();

export default cache;
