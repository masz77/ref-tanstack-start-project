# Logging Strategy for Hono.js + Better Auth Project

**Goal:** Implement **request-scoped structured logging**, a **`step()` timer utility**, and **sampled result logging** using our existing Pino + API logging infrastructure.

## Current Implementation Status

**Baseline logging infrastructure is already in place:**
- Pino JSON logger with request IDs (`src/middlewares/pino-logger.ts`)
- API request/response logging to database (`src/middlewares/api-logger.ts`)
- Request ID middleware from Hono
- Better Auth user context integration
- Sensitive data sanitization for passwords, tokens, etc.

## 1) Current Request Logging (Already Implemented)

Our middleware stack in `src/lib/create-app.ts` provides:

```typescript
app.use(requestId())                    // X-Request-Id generation
  .use(pinoLogger())                   // Structured JSON logging
  .use(apiLoggingMiddleware())         // Database logging
  .use(optionalAuthMiddleware)         // User context
```

**What we get:**
- Every request has a unique `reqId` via `hono/request-id` 
- Pino structured JSON logs with configurable levels
- Database storage of request/response data with user context
- Automatic sanitization of sensitive fields (passwords, tokens, etc.)
- IP address detection (X-Forwarded-For, CF-Connecting-IP, etc.)

**Environment Variables:**
- `LOG_LEVEL` - Controls Pino log level (default: "info")
- Pretty printing in development, JSON in production

## 2) Enhanced Step Timing (To Implement)

**Goal:** Add a `step()` utility for timing operations within Hono request handlers.

**Implementation Plan:**

Create `src/lib/logger-utils.ts`:

```typescript
import type { Context } from "hono";

interface StepOptions {
  summarize?: (result: any) => any;
  sampleRate?: number;
  level?: 'debug' | 'info' | 'warn' | 'error';
}

export async function step<T>(
  c: Context,
  name: string,
  fn: () => Promise<T>,
  options: StepOptions = {}
): Promise<T> {
  const logger = c.get('logger'); // From hono-pino
  const startTime = process.hrtime.bigint();
  
  try {
    const result = await fn();
    const endTime = process.hrtime.bigint();
    const durMs = Number(endTime - startTime) / 1000000;
    
    // Add to request timings for API logger
    const timings = c.get('timings') || [];
    timings.push({ name, durMs });
    c.set('timings', timings);
    
    // Sampled detailed logging
    const { sampleRate = 0.02, level = 'debug', summarize } = options;
    if (Math.random() < sampleRate && summarize) {
      logger[level]({ 
        step: name, 
        durMs, 
        result: summarize(result),
        reqId: c.get('requestId')
      }, `step_complete: ${name}`);
    } else {
      logger[level]({ 
        step: name, 
        durMs,
        reqId: c.get('requestId')
      }, `step_complete: ${name}`);
    }
    
    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const durMs = Number(endTime - startTime) / 1000000;
    
    logger.error({ 
      step: name, 
      durMs, 
      error: error instanceof Error ? error.message : 'Unknown error',
      reqId: c.get('requestId')
    }, `step_error: ${name}`);
    
    throw error;
  }
}
```

**Good `summarize()` patterns for this project:**

* Database queries: `{ count: rows.length, sampleIds: rows.slice(0,3).map(r => r.id) }`
* Better Auth operations: `{ userId: user?.id, action: 'login' }`  
* API responses: `{ status: res.status, size: JSON.stringify(res).length }`
* Arrays: `{ count: items.length, firstFew: items.slice(0, 2) }`

## 3) Usage Examples in Route Handlers

**In a typical Hono route with Drizzle ORM:**

```typescript
import { step } from "@/lib/logger-utils";
import { db } from "@/db";
import { users } from "@/db/schema";

app.openapi(getUsersRoute, async (c) => {
  // Database query step
  const userRows = await step(
    c,
    "db:users:findMany",
    () => db.select().from(users).limit(100),
    {
      summarize: (rows) => ({ 
        count: rows.length, 
        sampleIds: rows.slice(0, 3).map(r => r.id) 
      }),
      sampleRate: 0.05
    }
  );

  // Data transformation step  
  const transformedUsers = await step(
    c,
    "transform:users:toPublic",
    () => Promise.resolve(userRows.map(formatUserForAPI)),
    {
      summarize: (users) => ({ count: users.length }),
      sampleRate: 0.02
    }
  );

  return c.json({ users: transformedUsers });
});
```

**For Better Auth operations:**

```typescript
app.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid('json');
  
  const authResult = await step(
    c,
    "auth:signIn",
    () => auth.api.signInEmail({
      body: { email, password },
      headers: c.req.raw.headers
    }),
    {
      summarize: (result) => ({ 
        success: !!result.user,
        userId: result.user?.id 
      })
    }
  );

  return c.json(authResult);
});
```

**Naming Convention:**
- `layer:resource:action` format
- Examples: `db:users:findMany`, `auth:signIn`, `external:stripe:createPayment`, `cache:user:get`

## 4) Performance Guardrails

* **Always log durations** - `process.hrtime.bigint()` is very cheap
* **Sample payloads carefully** - 2-5% typical; reduce for high-traffic routes
* **Never stringify large results** outside `summarize()` functions
* **Bound summaries** - limit arrays to 3-5 items, truncate long strings
* **Leverage existing sanitization** - `ApiLogger.sanitizeObject()` already handles PII

## 5) Implementation Rollout (Based on Current State)

**✅ Phase A – Infrastructure (Already Complete)**
- [x] Pino logger with request IDs
- [x] API logging middleware with database storage  
- [x] Error handling and sanitization
- [x] User context from Better Auth

**Phase B – Add Step Utility**
- [ ] Create `src/lib/logger-utils.ts` with `step()` function
- [ ] Update middleware to include `timings` array in request context
- [ ] Test basic step timing functionality

**Phase C – Instrument Key Routes** 
- [ ] Add step timing to authentication routes (`src/routes/v1/auth/`)
- [ ] Instrument database queries in main business logic
- [ ] Start with `sampleRate = 0.02` and `debug` level

**Phase D – Production Optimization**
- [ ] Add environment variables for sampling rates
- [ ] Create lint rules for consistent step naming
- [ ] Add monitoring dashboards using existing API logs

## 6) Environment Configuration

**Current variables:**
- `LOG_LEVEL` - Pino log level (info/debug/warn/error)
- `NODE_ENV` - Controls pretty printing vs JSON

**Recommended additions:**
```bash
# Step timing defaults
LOG_SAMPLE_RATE_DEFAULT=0.02
LOG_STEP_LEVEL=debug

# Enhanced redaction (if needed beyond current sanitization)
LOG_REDACT_ADDITIONAL='["customField","internalId"]'
```

## 7) Sample Log Output

**Current API logging (already working):**
```json
{
  "level": 30,
  "time": 1641234567890,
  "reqId": "abc123",
  "msg": "Request completed",
  "method": "GET",
  "path": "/v1/users",
  "status": 200,
  "duration": 45,
  "userId": "user_xyz"
}
```

**Enhanced with step timing:**
```json
// Pino step log
{
  "level": 20,
  "time": 1641234567890,
  "reqId": "abc123",
  "step": "db:users:findMany",
  "durMs": 18.31,
  "result": {"count": 124, "sampleIds": ["u1", "u2", "u3"]},
  "msg": "step_complete: db:users:findMany"
}

// API logger with timings array
{
  "method": "GET",
  "path": "/v1/users", 
  "status": 200,
  "duration": 45,
  "timings": [
    {"name": "db:users:findMany", "durMs": 18.3},
    {"name": "transform:users:toPublic", "durMs": 4.9}
  ],
  "user": {"id": "user_xyz", "email": "user@example.com"}
}
```

## 8) Future: OpenTelemetry Integration

**When ready for distributed tracing:**
- Use `reqId` as trace correlation ID
- Map step names to OpenTelemetry span names  
- Export step timings as spans for 1:1 log-trace alignment
- Leverage existing Hono ecosystem OTEL packages

## 9) Monitoring Dashboard Queries

**Using existing API logs table:**
```sql
-- Average response times by endpoint
SELECT path, AVG(duration) as avg_ms 
FROM api_logs 
WHERE start_time > NOW() - INTERVAL '1 hour'
GROUP BY path;

-- Step timing analysis (when timings JSON is added)
SELECT 
  path,
  JSON_EXTRACT(timings, '$[*].name') as step_names,
  JSON_EXTRACT(timings, '$[*].durMs') as step_durations
FROM api_logs 
WHERE timings IS NOT NULL;
```