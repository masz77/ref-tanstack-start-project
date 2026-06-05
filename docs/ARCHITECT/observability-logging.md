# Observability & Request Logging

## Overview

**Cloudflare Workers Logs is the single source of truth for backend logs.** Every log is a
structured `console.*` line captured by the Workers runtime (`observability.enabled: true` in
`wrangler.jsonc`) and queryable via `wrangler tail`, the dashboard Observability tab, the
Workers Observability telemetry API, and Cloudflare's official observability MCP server.

There is **no database log sink.** The starter's `apiLogs` D1 table + `apiLoggingMiddleware` +
`logs` feature were **removed** in favour of Workers Logs (see [What was removed](#what-was-removed)).

> **Why Workers Logs over a DB table.** A DB-backed log (1) can't record failures of the very
> DB it logs to — the insert dies on the same dead connection; (2) adds a write to D1 on every
> request plus machinery (body capture, sanitisation, a `logs` query API, a queue cleanup job)
> for data the Workers runtime already captures for free; (3) is harder for tooling/agents to
> query than Workers Logs, which exposes a first-party telemetry API + MCP server. Workers Logs
> is lighter, DB-independent, and agent-queryable.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Log sink | **Workers Logs only** (structured `console.log` JSON), no DB table | Lighter, DB-independent, captured automatically; agent-queryable via the telemetry API + MCP server. |
| Request log line | One **structured JSON** `console.log` per request, emitted by `requestLogMiddleware` after `next()` | Field-indexed by Workers Logs (filter/sort by `path`/`status`/`durationMs`), unlike a free-text line. Metadata only. |
| Fire-and-forget | Emitted inline after the response status is known; **no `await`, no DB, no `waitUntil`** | `console.log` is ~microseconds and never touches the network — it can't add response latency or fail. |
| Error sink | `app.onError` → `console.error("[onError]", …)` (kept) | DB-independent error line with `requestId` + stack; also the only sink for errors thrown *before* the request-log middleware (CORS, rate limiter, auth-setup). |
| Correlation key | `requestId` (hono `requestId()` middleware) on every line | Ties the request line ↔ the `[onError]` line for one trace; queryable as a field. |
| No bodies / no PII | Log **metadata only** — never request/response bodies, headers, cookies, or tokens | Removes the redaction burden and the PII/secret exposure surface entirely. |
| Skip noisy paths | `requestLogMiddleware` skips `/health`, `/doc`, `/reference`, `/favicon.ico` and `OPTIONS` | Keeps the stream signal-rich; Cloudflare already records the raw invocation. |
| Retention | Accept Workers Logs retention: **3 days (Free) / 7 days (Workers Paid)**, fixed | Enough for live debugging. For longer history add Logpush → a warehouse (below). |

## What was removed

Replaced by Workers Logs:

| Removed | Was |
|---------|-----|
| `apiLogs` D1 table (`_log`) | request/response log rows — **dropped via migration `0002_drop_log.sql`** |
| `src/middleware/api-logger.ts` (`apiLoggingMiddleware`) + `src/lib/api-logger.ts` (`ApiLogger`) | the DB-writing logging middleware + helpers |
| `src/features/logs/**` (`routes.ts`, `service.ts`, `schemas.ts`) | the `/v1/logs/*` query API |
| `src/infrastructure/queue/handlers/logs.ts` + `LogsCleanupMessage` | the scheduled `apiLogs` retention cleanup |
| `/_logs` dashboard route(s) + the `apiLogs` write health-check in `src/features/health/routes.ts` | an HTML log viewer + DB-write liveness probe (now a `select 1` probe) |
| `LOGS_API_KEY` binding (`src/env.ts`) | auth for the removed logs API |

This template uses **Cloudflare D1**, so the DROP is a SQLite-style migration applied via
`wrangler d1 migrations apply` (`bun run d1:migrate:local` / `:remote`) — there is no
drizzle `db:migrate` here.

## Key Files

| File | Purpose |
|------|---------|
| `apps/backend/src/middleware/request-log.ts` | `requestLogMiddleware` — one structured JSON line per request (`method`, `path`, `status`, `durationMs`, `requestId`, `ip`, `userId` when present); skip rules; metadata only, no DB. |
| `apps/backend/src/lib/create-app.ts` | registers `requestId()` + `requestLogMiddleware`; `app.onError` → the DB-independent `[onError]` console sink. |
| `apps/backend/wrangler.jsonc` | `observability.enabled: true` — turns on Workers Logs / the runtime log stream. |

## The structured log line

`requestLogMiddleware` emits, after `next()`:

```jsonc
// console.log(JSON.stringify(...))
{
  "type": "request",
  "method": "GET",
  "path": "/api/example",
  "status": 200,
  "durationMs": 12,
  "requestId": "af0b9875-25a0-468a-8acb-e484b013e8bf",
  "ip": "203.0.113.7",
  "userId": "usr_123"   // present only when authenticated
}
```

Real JSON keys → Workers Logs indexes them, so you can filter `status = 500`,
`path = "/api/example"`, or sort by `durationMs`. **Never** add bodies, headers, cookies, or tokens.

## How to check logs

### Live — `wrangler tail`
```
cd apps/backend && bunx wrangler tail            # live stream
bunx wrangler tail --status error --format json  # errors only, JSON
```
Filters: `--status ok|error|canceled`, `--method`, `--search "<text>"`, `--ip self`,
`--sampling-rate`. Stream only — nothing stored.
Docs: https://developers.cloudflare.com/workers/wrangler/commands/workers/

### Historical + searchable — Dashboard → your Worker → Observability → Logs
Persisted by `observability.enabled: true`; search/filter by the structured fields above.
Retention 3 days (Free) / 7 days (Paid), fixed. Max log 256 KB.
Docs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/

### Programmatic / LLM-agent — Workers Observability telemetry API
REST, same backend as the dashboard tab (all **POST**):
- `POST /accounts/{account_id}/workers/observability/telemetry/query` — run a query
  (`view: "events"` for raw events, `timeframe {from,to}` in ms, `limit`, `parameters.filters`).
- `POST …/telemetry/keys` and `POST …/telemetry/values` — discover fields / values.
- Token scope ≈ Account Analytics Read (not spelled out on those pages).
- Docs: https://developers.cloudflare.com/api/resources/workers/subresources/observability/subresources/telemetry/methods/query/

### LLM-agent over MCP — Cloudflare's official Observability MCP server
- URL: **`https://observability.mcp.cloudflare.com/mcp`** (streamable-HTTP; the old `/sse`
  transport is deprecated).
- Tools: `query_worker_observability`, `observability_keys`, `observability_values`.
- Docs: https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/

### Long retention / SQL — Logpush (optional, not wired)
Dataset `workers_trace_events` includes `console.log` output (delivered as **unstructured**
lines) + exceptions. Destinations: R2, S3, GCS, BigQuery, Datadog, Splunk, Elasticsearch, …
Requires Workers Paid; enable per-Worker. Field-querying by an agent then depends on the sink.
Docs: https://developers.cloudflare.com/workers/observability/logs/logpush/

## Data Flow

```
Worker request
  → requestId()                          // correlation id
  → CORS / rate limiter / auth-setup
       (errors HERE are seen ONLY by onError — they are before requestLogMiddleware)
  → requestLogMiddleware
       if skip(path, method) → next() and emit nothing
       await next()                       // run the route
       console.log(JSON.stringify({ type:"request", method, path, status,
                                    durationMs, requestId, ip, userId? }))
  → response returned to client

  on any thrown error:
  → onError → console.error("[onError]", method, path, status, requestId, stack)
```

## How to debug a prod 500 (runbook)

1. **Dashboard → Observability → Logs**, filter `status >= 500` (and/or `requestId`/`path`).
   The request line gives method/path/status/`durationMs`/`requestId`; the `[onError]` line gives the stack.
2. **No request line at all?** The failure is **before** `requestLogMiddleware` (CORS / rate
   limiter / auth-setup) or a **hang** (a hang throws nothing and never reaches the end of the
   middleware). Switch to `wrangler tail` and look for `[onError]` or `outcome:"exception"`.
3. **Correlate** `requestId` across lines.

## Security Considerations

- **Metadata only, by construction** — no bodies, headers, cookies, or tokens in the request
  line, so there is nothing to redact and no PII/secret can leak through logging.
- **`userId` is an identifier, not a secret** — safe to log and useful for filtering.
- **Logs leave the account boundary only via Logpush** (off by default); the metadata-only
  guarantee carries through since bodies are never logged.
- **DB-independent error path** — `onError` never depends on D1, so an infra failure stays visible.
</content>
