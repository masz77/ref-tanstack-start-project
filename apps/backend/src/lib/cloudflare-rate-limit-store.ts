import type { ClientRateLimitInfo, ConfigType, Store } from "hono-rate-limiter";

/**
 * Cloudflare Workers compliant in-memory rate limit store.
 *
 * Avoids timers, intervals, and other disallowed operations during the global
 * scope evaluation by performing maintenance lazily while handling requests.
 */
export class CloudflareRateLimitStore implements Store {
  private windowMs = 60_000;

  private readonly clients = new Map<
    string,
    ClientRateLimitInfo & {
      expiresAt: number;
      lastSeen: number;
    }
  >();

  private requestCounter = 0;
  private readonly cleanupInterval = 100;

  init(options: Partial<ConfigType>): void {
    this.windowMs = options.windowMs ?? this.windowMs;
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const entry = this.clients.get(key);
    if (!entry) {
      return undefined;
    }

    // Lazy expiry check - delete if expired
    if (entry.expiresAt <= Date.now()) {
      this.clients.delete(key);
      return undefined;
    }

    return {
      totalHits: entry.totalHits,
      resetTime: entry.resetTime,
    };
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const entry = this.getOrCreateEntry(key, now);
    entry.totalHits += 1;
    entry.lastSeen = now;
    this.clients.set(key, entry);

    // Periodic batch cleanup to prevent unbounded memory growth
    this.requestCounter += 1;
    if (this.requestCounter >= this.cleanupInterval) {
      this.requestCounter = 0;
      this.cleanupExpired(now);
    }

    return {
      totalHits: entry.totalHits,
      resetTime: entry.resetTime,
    };
  }

  async decrement(key: string): Promise<void> {
    const entry = this.clients.get(key);
    if (!entry) {
      return;
    }

    // Lazy expiry check - consistent with get() behavior
    if (entry.expiresAt <= Date.now()) {
      this.clients.delete(key);
      return;
    }

    if (entry.totalHits > 0) {
      entry.totalHits -= 1;
      entry.lastSeen = Date.now();
      this.clients.set(key, entry);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.clients.delete(key);
  }

  async resetAll(): Promise<void> {
    this.clients.clear();
  }

  async shutdown(): Promise<void> {
    this.clients.clear();
  }

  private getOrCreateEntry(key: string, now: number) {
    const existing = this.clients.get(key);
    if (existing && existing.expiresAt > now) {
      return existing;
    }

    const resetTime = new Date(now + this.windowMs);
    return {
      totalHits: existing && existing.expiresAt > now ? existing.totalHits : 0,
      resetTime,
      expiresAt: resetTime.getTime(),
      lastSeen: now,
    };
  }

  private cleanupExpired(now: number = Date.now()): void {
    for (const [key, entry] of this.clients.entries()) {
      if (entry.expiresAt <= now) {
        this.clients.delete(key);
      }
    }
  }
}

export default CloudflareRateLimitStore;
