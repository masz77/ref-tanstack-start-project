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
 *   directly, and never reach into `@repo/shared` for response types (`@repo/shared`
 *   provides envelope shapes + runtime schemas only).
 *
 * See `docs/ARCHITECT/shared-types.md` for the full rationale.
 */

import type { InferRequestType, InferResponseType } from 'hono/client'
import type { ApiClient } from '@/lib/api-client'

// Re-export the runtime pagination schema (used by the paginated logs endpoint).
// Request types for logs come from `InferRequestType` below, not from `@repo/shared`.
export { paginationSchema } from '@repo/shared'
export type { PaginationInput } from '@repo/shared'

// --- Health contract ---

export type HealthResponse = InferResponseType<
  ApiClient['health']['$get']
>['data']

export type ApiIndexResponse = InferResponseType<
  ApiClient['index']['$get']
>['data']

// `/test` returns 201 on success (and a 500 body shape we don't surface).
export type TestResponse = InferResponseType<
  ApiClient['test']['$get'],
  201
>['data']

// --- Logs contract ---

// Paginated list: expose the full response so callers can read `pagination`/`summary`,
// plus the item shape via `[number]`.
export type LogsByPathResponse = InferResponseType<
  ApiClient['v1']['logs']['by-path']['$get']
>
export type LogItem = LogsByPathResponse['data'][number]

// Recent logs: `{ data: LogItem[] }`. The item shape differs from `by-path`'s
// `LogItem` (fewer fields), so it gets its own type.
export type RecentLogsResponse = InferResponseType<
  ApiClient['v1']['logs']['recent']['$get']
>['data']
export type RecentLogItem = RecentLogsResponse[number]

export type LogsStatsResponse = InferResponseType<
  ApiClient['v1']['logs']['stats']['$get']
>['data']

export type LogsStatsRangeResponse = InferResponseType<
  ApiClient['v1']['logs']['stats-range']['$get']
>['data']
export type LogsStatsRangeQuery = InferRequestType<
  ApiClient['v1']['logs']['stats-range']['$get']
>['query']

export type EndpointMetricsResponse = InferResponseType<
  ApiClient['v1']['logs']['endpoint-metrics']['$get']
>['data']
export type EndpointMetric = EndpointMetricsResponse[number]

export type LogDetail = InferResponseType<
  ApiClient['v1']['logs'][':id']['$get']
>['data']

export type CleanupLogsResponse = InferResponseType<
  ApiClient['v1']['logs']['cleanup']['$post']
>['data']
export type CleanupLogsQuery = InferRequestType<
  ApiClient['v1']['logs']['cleanup']['$post']
>['query']
