# WebSocket Factory Setup for Hono.js Backend Template

## Overview

This document evaluates the approach for adding WebSocket support to the Hono.js Cloudflare Workers backend template. The recommended architecture uses Hono's WebSocket Helper with Cloudflare Durable Objects for stateful connection management and the WebSocket Hibernation API for cost optimization.

## Current State

| Aspect | Status |
|--------|--------|
| WebSocket support | **None** |
| Durable Objects | **Not configured** (only D1 + KV) |
| Real-time patterns | **None** (REST-only) |
| Event-driven | Cron jobs via `CronManager` only |

## Architecture Decision

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WebSocket library | **Hono WebSocket Helper** (`hono/cloudflare-workers`) | Native integration, no external deps |
| State management | **Cloudflare Durable Objects** | Required for connection coordination |
| Hibernation | **WebSocket Hibernation API** | 90%+ cost reduction for sparse messaging |
| Alternative considered | PartyKit/hono-party | Good option for collaborative features |

## Pros

| Benefit | Details | Reality Check |
|---------|---------|---------------|
| **Native Hono integration** | `upgradeWebSocket()` from `hono/cloudflare-workers` works seamlessly with existing middleware | Directly applicable - template already uses Hono |
| **Global edge deployment** | Connections handled at nearest Cloudflare edge location | Yes - template uses `placement.mode: "smart"` |
| **Cost-efficient hibernation** | Durable Objects sleep during idle periods, only billing for active processing | Critical for production - hibernation can reduce costs by 90%+ |
| **Stateful coordination** | Durable Objects ensure all clients in a "room" connect to same instance | Required for chat, collaboration, multiplayer use cases |
| **Automatic reconnection** | Can implement client-side reconnection or use PartySocket library | Useful but requires client-side implementation |
| **Message batching** | 20:1 billing ratio for WebSocket messages | Good for high-frequency messaging apps |
| **TypeScript support** | Full type safety with Hono's type inference | Aligns with template's type-safe approach |
| **32 MiB message size** | Increased from 1 MiB limit | Sufficient for most real-time use cases |

## Cons

| Risk | Details | Severity |
|------|---------|----------|
| **Durable Objects required** | Cannot coordinate multiple WebSocket connections without DO | **HIGH** - Mandatory for any multi-client scenario |
| **CORS middleware conflict** | `upgradeWebSocket()` modifies headers internally, conflicts with middleware that also modifies headers | **MEDIUM** - Requires workaround (skip CORS for WS routes) |
| **`onOpen` event unreliable** | GitHub issue #3448 reports `onOpen` not triggered on Cloudflare Workers | **MEDIUM** - Use `onMessage` for initialization instead |
| **Limited testing utilities** | No built-in WebSocket testing helpers in Hono (GitHub issue #3185) | **MEDIUM** - Manual testing setup required |
| **Single-threaded bottleneck** | Each DO handles ~1,000 req/sec max; requires sharding for scale | **MEDIUM** - Design sharding strategy upfront |
| **No pub/sub built-in** | Must implement broadcast logic manually or use PartyKit | **LOW** - Straightforward to implement |
| **TypeScript type issues** | `ws.raw` typed as `unknown`, requires casting for platform-specific APIs | **LOW** - Workaround with type assertions |
| **Constructor overhead** | DO constructor runs on every wake from hibernation - must be lightweight | **LOW** - Follow best practices for minimal constructor |

## Critical Findings

### 1. Durable Objects Are Non-Negotiable for Multi-Client WebSockets

Workers are stateless - each request may hit a different instance. Without Durable Objects:
- No shared state between connections
- No way to broadcast to multiple clients
- No coordination between users

**Source**: [Cloudflare Durable Objects Best Practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)

### 2. WebSocket Hibernation API Dramatically Reduces Costs

| Scenario | Without Hibernation | With Hibernation |
|----------|--------------------|--------------------|
| 100 DOs, 50 connections each, 8hr/day | ~$133/month duration | Near-zero when idle |
| Idle connection (no messages) | Billed continuously | No billing during hibernation |

**Key**: Use `this.ctx.acceptWebSocket(server)` instead of `ws.accept()` for hibernation support.

**Source**: [Cloudflare Pricing Docs](https://developers.cloudflare.com/durable-objects/platform/pricing/)

### 3. Known Hono WebSocket Issues on Cloudflare Workers

| Issue | Impact | Workaround |
|-------|--------|------------|
| `onOpen` not triggered (#3448) | Can't rely on open event | Initialize state on first message |
| CORS + WebSocket conflict (#4090) | Headers immutable error | Skip CORS middleware for WS routes |
| Headers immutable (#1102) | Middleware chain breaks | Place WS routes before header-modifying middleware |

**Source**: [GitHub Issues](https://github.com/honojs/hono/issues/3448)

### 4. Scaling Limits

| Limit | Value | Mitigation |
|-------|-------|------------|
| DO throughput | ~1,000 req/sec per instance | Shard by room/topic |
| WebSocket message size | 32 MiB | Sufficient for most use cases |
| Connections per DO | No explicit limit | Limited by single-thread processing |
| CPU per invocation | 30 seconds (configurable) | Batch messages, minimize processing |

**Source**: [Durable Objects Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

### 5. Alternative: PartyKit/hono-party

For collaborative editing or complex real-time features, consider [hono-party](https://github.com/cloudflare/partykit/blob/main/packages/hono-party/README.md):
- Built-in reconnection handling
- Yjs support for CRDTs
- Pub/sub at scale via `partysub`
- Middleware for Hono integration

## Implementation Approach

### Phase 1: Durable Object Setup

1. Add to `wrangler.json`:
```json
{
  "durable_objects": {
    "bindings": [
      { "name": "WEBSOCKET_ROOM", "class_name": "WebSocketRoom" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_classes": ["WebSocketRoom"] }
  ]
}
```

2. Create `src/durable-objects/websocket-room.ts`:
```typescript
import { DurableObject } from "cloudflare:workers";

export class WebSocketRoom extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Use Hibernation API
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Broadcast to all connected clients
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      socket.send(typeof message === "string" ? message : new TextDecoder().decode(message));
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    ws.close(code, reason);
  }
}
```

### Phase 2: Hono Route Integration

```typescript
// src/routes/v1/ws/ws.index.ts
import { createRouter } from "@/lib/create-app";

const router = createRouter();

// Note: Skip CORS middleware for this route
router.get("/ws/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const id = c.env.WEBSOCKET_ROOM.idFromName(roomId);
  const stub = c.env.WEBSOCKET_ROOM.get(id);
  return stub.fetch(c.req.raw);
});

export default router;
```

### Phase 3: Type Definitions

Add to `src/lib/types.ts`:
```typescript
export type AppBindings = {
  // ... existing bindings
  WEBSOCKET_ROOM: DurableObjectNamespace;
};
```

## Key Files to Modify

| File | Change |
|------|--------|
| `wrangler.json` | Add `durable_objects` binding |
| `src/lib/types.ts` | Add DO namespace type |
| `src/durable-objects/websocket-room.ts` | **Create** - DO implementation |
| `src/routes/v1/ws/ws.index.ts` | **Create** - WebSocket route |
| `src/app.ts` | Mount WebSocket router (before CORS middleware) |
| `src/lib/create-app.ts` | Consider conditional CORS for WS routes |

## Cost Estimate (Production)

| Scenario | Monthly Cost |
|----------|--------------|
| 1,000 users, 10 rooms, 100 msg/user/day | ~$10-15 |
| 10,000 users, 100 rooms, 1,000 msg/user/day | ~$50-100 |
| High-frequency (gaming, 10 msg/sec) | Requires sharding, ~$200+ |

*Assumes WebSocket Hibernation API usage. Without hibernation, costs increase 10x+.*

## Recommendation

**GO** - Proceed with implementation using Hono WebSocket Helper + Durable Objects + Hibernation API.

### Conditions
1. Use WebSocket Hibernation API for all WebSocket connections
2. Design sharding strategy before implementing high-traffic features
3. Skip CORS middleware for WebSocket routes
4. Don't rely on `onOpen` event - initialize on first message
5. Consider PartyKit if building collaborative editing features

### Not Recommended For
- Simple notification use cases (consider Server-Sent Events instead)
- Low-budget projects without real-time requirements (adds ~$5/month minimum)

## Sources

### Official Documentation
- [Hono WebSocket Helper](https://hono.dev/docs/helpers/websocket)
- [Cloudflare Workers WebSocket Docs](https://developers.cloudflare.com/workers/examples/websockets/)
- [Durable Objects WebSocket Best Practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [WebSocket Hibernation Server Example](https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server/)
- [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)

### Tutorials & Examples
- [Creating a WebSocket Server with Hono and Durable Objects (Fiberplane)](https://dev.to/fiberplane/creating-a-websocket-server-in-hono-with-durable-objects-4ha3)
- [Build Real-Time Apps with Cloudflare, Hono, Durable Objects (DZone)](https://dzone.com/articles/serverless-websocket-real-time-apps)
- [Building a Chatroom with Cloudflare Workers](https://dev.to/viiik/making-a-real-time-chatroom-app-with-cloudflare-workers-2cp4)
- [How to Build Serverless WebSockets (Volito)](https://volito.digital/how-to-build-serverless-websockets-with-cloudflare-hono-and-durable-objects/)

### GitHub Issues (Known Problems)
- [#3448 - onOpen not triggered on Cloudflare Workers](https://github.com/honojs/hono/issues/3448)
- [#4090 - CORS and WebSocket conflict](https://github.com/honojs/hono/issues/4090)
- [#1102 - Headers immutable with middleware](https://github.com/honojs/hono/issues/1102)
- [#3185 - No WebSocket testing utilities](https://github.com/honojs/hono/issues/3185)
- [#3206 - Durable Object not triggered with Hono](https://github.com/honojs/hono/issues/3206)

### Alternative Solutions
- [PartyKit / hono-party](https://github.com/cloudflare/partykit/blob/main/packages/hono-party/README.md)
- [hono-do Wrapper Library](https://github.com/sor4chi/hono-do)

---

## Session Notes

### 2026-02-04 — Research Session
- Confirmed no existing WebSocket implementation in template
- Durable Objects required for multi-client WebSocket coordination (Workers are stateless)
- WebSocket Hibernation API reduces costs by 90%+ during idle periods
- Known issues: `onOpen` event unreliable, CORS middleware conflicts with WebSocket routes
- Hono's `upgradeWebSocket()` from `hono/cloudflare-workers` is the recommended approach
- PartyKit/hono-party is viable alternative for collaborative features (Yjs support)
- Scaling requires sharding at ~1,000 req/sec per Durable Object
- WebSocket message billing uses 20:1 ratio (1M messages = 50K billed requests)
- Template already has smart placement enabled - good for edge distribution
