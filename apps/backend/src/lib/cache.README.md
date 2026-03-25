# Cache Service

This service provides a simple caching layer using Redis with graceful fallback.

## Features

- **Graceful Fallback**: If `REDIS_URL` is not provided, the cache methods become no-ops and don't prevent the app from starting
- **Connection Handling**: Properly handles Redis connection errors and reconnections
- **Full API**: Provides get, set, del, exists, and flushAll methods
- **TTL Support**: Supports time-to-live for cached entries

## Usage

### Environment Configuration

Add `REDIS_URL` to your `.env` file:

```bash
# Redis connection URL (optional - cache will be disabled if not provided)
REDIS_URL=redis://localhost:6379
```

If `REDIS_URL` is not provided, all cache operations will be no-ops.

### Programmatic Usage

```typescript
import { cache } from "@/lib/cache";

// Set a value with optional TTL (in seconds)
await cache.set("my-key", "my-value", 3600); // Expires in 1 hour

// Get a value
const value = await cache.get("my-key");

// Check if a key exists
const exists = await cache.exists("my-key");

// Delete a value
await cache.del("my-key");

// Clear all cache entries
await cache.flushAll();
```

### Testing

The cache service includes comprehensive tests that work with both Redis and the noop implementation:

```bash
bun run test src/lib/cache.test.ts
```