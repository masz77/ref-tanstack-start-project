/**
 * Canonical frontend type surface.
 *
 * This is the ONE place where backend response/request types are derived from the
 * Hono RPC `AppType` (via `ApiClient`) using `InferResponseType` / `InferRequestType`.
 * Every backend success response uses the uniform `{ data: T }` envelope, so each
 * type peels `.data` here once.
 *
 * Rules:
 * - Components import named types from `@/lib/contracts` only.
 * - Components NEVER re-derive backend types inline, never index `AppType`/`ApiClient`
 *   directly, and never reach into the backend internals for response types — every
 *   type below is derived from the Hono RPC `AppType` and peels the `{ data: T }` envelope.
 *
 * 2026-05-24: Every `InferResponseType` is status-narrowed to the route's SUCCESS status
 * (200, or 201 for `/test`). A route's response is a union of its success body plus its
 * documented error bodies (the logs routes now declare 401/404/500 with an error schema
 * so Scalar shows them). Without narrowing, `['data']` would peel across that union and
 * collapse; pinning the success status keeps each `.data` a real shape and makes adding
 * future error statuses non-breaking.
 *
 * See `docs/ARCHITECT/shared-types.md` for the full rationale.
 */

import type { InferRequestType, InferResponseType } from 'hono/client'
import type { ApiClient } from '@/lib/api-client'

// --- Health contract ---

export type HealthResponse = InferResponseType<ApiClient['health']['$get'], 200>['data']

export type ApiIndexResponse = InferResponseType<ApiClient['index']['$get'], 200>['data']

// `/test` returns 201 on success (and a 500 body shape we don't surface).
export type TestResponse = InferResponseType<ApiClient['test']['$get'], 201>['data']

// --- Logs contract ---

// Paginated list: expose the full response so callers can read `pagination`/`summary`,
// plus the item shape via `[number]`.
export type LogsByPathResponse = InferResponseType<ApiClient['v1']['logs']['by-path']['$get'], 200>
export type LogItem = LogsByPathResponse['data'][number]

// Recent logs: `{ data: LogItem[] }`. The item shape differs from `by-path`'s
// `LogItem` (fewer fields), so it gets its own type.
export type RecentLogsResponse = InferResponseType<
  ApiClient['v1']['logs']['recent']['$get'],
  200
>['data']
export type RecentLogItem = RecentLogsResponse[number]

export type LogsStatsResponse = InferResponseType<
  ApiClient['v1']['logs']['stats']['$get'],
  200
>['data']

export type LogsStatsRangeResponse = InferResponseType<
  ApiClient['v1']['logs']['stats-range']['$get'],
  200
>['data']
export type LogsStatsRangeQuery = InferRequestType<
  ApiClient['v1']['logs']['stats-range']['$get']
>['query']

export type EndpointMetricsResponse = InferResponseType<
  ApiClient['v1']['logs']['endpoint-metrics']['$get'],
  200
>['data']
export type EndpointMetric = EndpointMetricsResponse[number]

export type LogDetail = InferResponseType<ApiClient['v1']['logs'][':id']['$get'], 200>['data']

// cleanup POST returns 200 on success (handler: `c.json(..., 200)`).
export type CleanupLogsResponse = InferResponseType<
  ApiClient['v1']['logs']['cleanup']['$post'],
  200
>['data']
export type CleanupLogsQuery = InferRequestType<
  ApiClient['v1']['logs']['cleanup']['$post']
>['query']
