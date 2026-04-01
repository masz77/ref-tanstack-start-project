# Streaming Factory Pattern for Hono.js

## Overview

This document evaluates implementing a streaming factory pattern for Server-Sent Events (SSE) and text streaming in this Hono.js backend template deployed on Cloudflare Workers.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Streaming method | **Hono built-in helpers** (`streamSSE`, `streamText`) | Native support, zero dependencies, optimized for edge |
| AI integration | **Vercel AI SDK compatible** | Industry standard, `toTextStreamResponse()` pipes directly |
| OpenAPI docs | **Manual response schema** (workaround) | Type mismatch issue with `@hono/zod-openapi` ([#735](https://github.com/honojs/middleware/issues/735)) |
| Heartbeat | **30-second comment pings** | Prevents Cloudflare 524 timeout (100s limit) |
| Wrangler workaround | **`Content-Encoding: Identity`** | Required for local development streaming |

## Streaming Helpers Available

Hono provides three streaming helpers from `hono/streaming`:

| Helper | Content-Type | Use Case |
|--------|--------------|----------|
| `stream()` | Custom | Raw binary/Uint8Array streaming |
| `streamText()` | `text/plain` | Plain text streaming (AI responses) |
| `streamSSE()` | `text/event-stream` | SSE with event types, IDs, retry |

## Pros

| Benefit | Details | Reality Check |
|---------|---------|---------------|
| Native Hono support | Built-in helpers, no external deps | Reduces bundle size, matches existing patterns |
| Cloudflare optimized | No effective time limit for streaming | Critical for long AI responses |
| AI SDK compatible | `streamText().toTextStreamResponse()` | Standard pattern for AI APIs |
| Automatic reconnection | SSE EventSource handles reconnects | Reduces client-side complexity |
| Simple API | Callback-based with `stream.write()` | Easy to implement and test |
| HTTP/2 multiplexing | Works well with modern connections | Performance benefit |

## Cons

| Risk | Details | Severity |
|------|---------|----------|
| OpenAPI type mismatch | `streamSSE` return type incompatible with `@hono/zod-openapi` ([#735](https://github.com/honojs/middleware/issues/735)) | **MEDIUM** - Requires workaround |
| Wrangler local issues | Streaming may not work without `Content-Encoding: Identity` header | **LOW** - Simple workaround |
| 100s timeout risk | Cloudflare returns 524 if no data sent for 100 seconds | **MEDIUM** - Requires heartbeat |
| No bidirectional | SSE is server-to-client only | **LOW** - Use WebSockets if needed |
| Error handling differs | `onError` middleware doesn't trigger after stream starts | **LOW** - Handle in callback |
| Unofficial SSE support | Cloudflare recommends WebSockets for long connections | **LOW** - SSE works, just less documented |

## Critical Findings

### 1. OpenAPI Type Issue (Open)

The `streamSSE` return type doesn't match `@hono/zod-openapi` expectations. **Workaround**: Define response schema with `text/event-stream` content type but cast the return:

```typescript
import { createRoute } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";

// Route definition (for docs only)
const streamRoute = createRoute({
  method: "get",
  path: "/stream",
  responses: {
    200: {
      description: "SSE stream",
      content: {
        "text/event-stream": {
          schema: z.any(), // SSE doesn't fit Zod well
        },
      },
    },
  },
});

// Handler - cast to bypass type issue
app.openapi(streamRoute, (c) => {
  return streamSSE(c, async (stream) => {
    // ...
  }) as any; // Type workaround until #735 is resolved
});
```

### 2. Cloudflare 524 Timeout Prevention

Must send data every 100 seconds. **Solution**: Heartbeat comments (ignored by EventSource):

```typescript
return streamSSE(c, async (stream) => {
  const heartbeat = setInterval(async () => {
    await stream.writeSSE({ data: "", comment: "heartbeat" });
  }, 30000); // Every 30 seconds

  stream.onAbort(() => clearInterval(heartbeat));

  // ... streaming logic
});
```

### 3. Wrangler Local Development

Add header for local streaming to work:

```typescript
app.get("/stream", (c) => {
  c.header("Content-Encoding", "Identity");
  return streamSSE(c, async (stream) => {
    // ...
  });
});
```

## Proposed Factory Pattern

Create a streaming helper factory in `src/lib/streaming.ts`:

```typescript
import type { Context } from "hono";
import { streamSSE, streamText } from "hono/streaming";
import type { AppBindings } from "@/lib/types";

type StreamCallback<T> = (stream: T) => Promise<void>;

interface StreamOptions {
  heartbeatMs?: number; // Default: 30000
}

/**
 * SSE streaming with automatic heartbeat and local dev workaround
 */
export function createSSEStream(
  c: Context<AppBindings>,
  callback: StreamCallback<SSEStreamingApi>,
  options: StreamOptions = {}
) {
  const { heartbeatMs = 30000 } = options;

  // Wrangler local dev workaround
  c.header("Content-Encoding", "Identity");

  return streamSSE(c, async (stream) => {
    // Heartbeat to prevent 524 timeout
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ data: "", comment: "heartbeat" });
      } catch {
        clearInterval(heartbeat);
      }
    }, heartbeatMs);

    stream.onAbort(() => clearInterval(heartbeat));

    try {
      await callback(stream);
    } finally {
      clearInterval(heartbeat);
    }
  });
}

/**
 * Text streaming for simple responses
 */
export function createTextStream(
  c: Context<AppBindings>,
  callback: StreamCallback<StreamingApi>
) {
  c.header("Content-Encoding", "Identity");
  return streamText(c, callback);
}
```

## AI SDK Integration Pattern

For AI/LLM responses using Vercel AI SDK:

```typescript
import { streamText } from "ai";
import { stream } from "hono/streaming";

app.post("/ai/chat", async (c) => {
  const { prompt } = await c.req.json();

  const result = await streamText({
    model: openai("gpt-4"),
    prompt,
  });

  // Direct pipe - simplest approach
  return result.toTextStreamResponse({
    headers: {
      "Content-Type": "text/x-unknown",
      "Content-Encoding": "identity",
      "Transfer-Encoding": "chunked",
    },
  });
});
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/streaming.ts` | Streaming factory helpers (to create) |
| `src/lib/create-app.ts` | App factory (existing) |
| `src/routes/v1/{feature}/` | Feature routes using streaming |

## Dependencies Required

No new dependencies - uses built-in `hono/streaming`.

Optional for AI integration:
- `ai` (Vercel AI SDK)
- `@ai-sdk/openai` or other provider packages

## Recommendation

**YES - Implement streaming factory**

Conditions:
- Use the proposed factory pattern in `src/lib/streaming.ts`
- Always include heartbeat for SSE (30s interval)
- Add `Content-Encoding: Identity` for local dev
- Accept TypeScript `as any` cast until [#735](https://github.com/honojs/middleware/issues/735) is resolved
- Document SSE endpoints in OpenAPI with `z.any()` response schema

## When to Use SSE vs WebSockets

| Use SSE | Use WebSockets |
|---------|----------------|
| AI/LLM streaming responses | Real-time chat (bidirectional) |
| Progress updates | Gaming, collaborative editing |
| Notification feeds | Long-lived connections (hours) |
| Simple server-push | High-frequency bidirectional data |

## Session Notes

### 2026-02-04 - Research Session

- **Key finding**: Hono's built-in `streamSSE` and `streamText` are production-ready on Cloudflare Workers
- **Key finding**: OpenAPI type issue ([#735](https://github.com/honojs/middleware/issues/735)) requires workaround but is manageable
- **Key finding**: 100-second Cloudflare timeout requires heartbeat implementation
- **Key finding**: Wrangler local dev needs `Content-Encoding: Identity` header

**Sources consulted**:
- [Hono Streaming Helper Docs](https://hono.dev/docs/helpers/streaming)
- [Cloudflare Agents SSE Documentation](https://developers.cloudflare.com/agents/api-reference/http-sse/)
- [Vercel AI SDK Hono Examples](https://ai-sdk.dev/examples/api-servers/hono)
- [GitHub Issue #735 - streamSSE type issues](https://github.com/honojs/middleware/issues/735)
- [SSE with Cloudflare Workers](https://dev.to/jswhisperer/sse-cool-starter-with-cloudflare-workers-and-hono-server-1ml)
- [Hono + Vercel AI SDK Example](https://github.com/yusukebe/hono-with-vercel-ai)
- [Build AI-Powered API with Hono](https://komelin.com/blog/build-ai-powered-api)
- [Cloudflare SSE Timeout Discussion](https://community.cloudflare.com/t/are-server-sent-events-sse-supported-or-will-they-trigger-http-524-timeouts/499621)
