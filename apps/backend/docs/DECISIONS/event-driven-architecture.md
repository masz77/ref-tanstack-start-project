# Event-Driven Architecture

## Overview

Dual event architecture combining in-process typed events for synchronous operations with Cloudflare Queues for durable asynchronous processing. Routes emit events, listeners handle sync work and bridge to queues, queue consumers handle durable tasks.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| In-process events | **@hono/event-emitter** | Type-safe, zero-latency sync events for immediate reactions |
| Durable async processing | **Cloudflare Queues** | Built-in retry, batching, global distribution |
| Event emission location | **Routes only** | Routes emit, don't orchestrate; clean separation |
| Queue fallback | **Graceful degradation** | Console logging when queue unavailable (local dev) |
| Retry strategy | **Exponential backoff** | 60s, 120s, 240s delays; ack after 3 failures (DLQ behavior) |

## Key Files

| File | Purpose |
|------|---------|
| `src/events/types.ts` | AppEvents discriminated union, AppEmitter type |
| `src/events/listeners.ts` | Event listeners, safeQueue helper, queue bridging |
| `src/queue/types.ts` | QueueMessage discriminated union |
| `src/queue/handler.ts` | Batch processor, message router, retry logic |
| `src/queue/handlers/*.ts` | Individual message type handlers |
| `src/lib/create-app.ts` | Emitter creation and listener registration |
| `src/index.ts` | Worker entry point with fetch + queue exports |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Route Handler                           │
│                                                                 │
│  c.get("emitter").emit("user:created", { userId, email, name }) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Emitter (sync)                         │
│                                                                 │
│  onUserCreated listener:                                        │
│  1. Log event (immediate)                                       │
│  2. safeQueue() → EVENTS_QUEUE.send({ type: "email:send", ... })│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Queue (async)                      │
│                                                                 │
│  • Batches up to 10 messages                                    │
│  • 30s max wait before processing                               │
│  • Retries with exponential backoff                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Queue Consumer                               │
│                                                                 │
│  handleQueue() → switch(message.type) → handleEmailSend()       │
│  • Ack on success                                               │
│  • Retry with delay on failure                                  │
│  • Ack after 3 failures (DLQ behavior)                          │
└─────────────────────────────────────────────────────────────────┘
```

## Event Types

### In-Process Events (AppEvents)

| Event | Payload | Triggered By |
|-------|---------|--------------|
| `user:created` | userId, email, name | User registration |
| `user:deleted` | userId, email | Account deletion |
| `auth:session-created` | userId, sessionId, userAgent, ipAddress | Login |
| `subscription:changed` | userId, customerId, subscriptionId, status, priceId | Stripe webhook |

### Queue Messages (QueueMessage)

| Type | Payload | Handler |
|------|---------|---------|
| `email:send` | to, template, data, correlationId | Send transactional email |
| `stripe:sync` | userId, customerId, action, correlationId | Sync with Stripe API |
| `webhook:process` | webhookId, payload, source, correlationId | Process incoming webhooks |
| `logs:cleanup` | olderThanDays, correlationId | Delete old API logs |

## Usage Example

```typescript
// In a route handler:
import type { Context } from "hono";
import type { AppBindings } from "@/lib/types";

export async function createUserHandler(c: Context<AppBindings>) {
  const user = await createUser(c, data);

  // Emit event - listeners handle the rest
  c.get("emitter").emit("user:created", {
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return c.json({ user });
}
```

## Queue Configuration (wrangler.json)

```json
"queues": {
  "producers": [{
    "queue": "events-queue",
    "binding": "EVENTS_QUEUE"
  }],
  "consumers": [{
    "queue": "events-queue",
    "max_batch_size": 10,
    "max_batch_timeout": 30,
    "max_retries": 3
  }]
}
```

## Local Development

When `EVENTS_QUEUE` is not bound (local dev without queue):
- Events still fire normally
- `safeQueue()` logs to console instead of queuing
- All sync listener logic executes normally
- No errors or failures

## Testing Queue Messages

```bash
# Send test message to deployed queue
wrangler queues send events-queue '{"type":"email:send","to":"test@example.com","template":"welcome","data":{"name":"Test"},"correlationId":"test-123"}'
```

## Adding New Events

1. Add event type to `src/events/types.ts`:
   ```typescript
   export type MyNewEvent = { ... };
   // Add to AppEvents union
   ```

2. Create listener in `src/events/listeners.ts`:
   ```typescript
   export function onMyNewEvent(c: Context<AppBindings>, payload: MyNewEvent) { ... }
   ```

3. Register in `src/lib/create-app.ts`:
   ```typescript
   emitter.on("my:new-event", onMyNewEvent);
   ```

## Adding New Queue Messages

1. Add message type to `src/queue/types.ts`:
   ```typescript
   export type MyNewMessage = { type: "my:new"; ... };
   // Add to QueueMessage union
   ```

2. Create handler in `src/queue/handlers/my-new.ts`:
   ```typescript
   export async function handleMyNew(message: MyNewMessage, env: Env) { ... }
   ```

3. Add case to `src/queue/handler.ts`:
   ```typescript
   case "my:new":
     await handleMyNew(message, env);
     break;
   ```

## Security Considerations

- Queue messages should not contain sensitive data (tokens, passwords)
- Use correlation IDs for tracing across systems
- Handlers validate message structure before processing
- Failed messages are logged but not persisted to disk (DLQ behavior via ack)
