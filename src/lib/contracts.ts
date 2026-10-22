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
 * (200). A route's response is a union of its success body plus its documented error
 * bodies. Without narrowing, `['data']` would peel across that union and collapse; pinning
 * the success status keeps each `.data` a real shape.
 *
 * 2026-10-22: Only the health/index/test types remain; the `/v1/logs` routes were removed.
 * The UI now reads these through server functions (`@/features/health/health.functions`),
 * so nothing in the app imports this file yet.
 */

import type { InferResponseType } from 'hono/client'
import type { ApiClient } from '@/lib/api-client'

// --- Health contract ---

export type HealthResponse = InferResponseType<ApiClient['api']['health']['$get'], 200>['data']

export type ApiIndexResponse = InferResponseType<ApiClient['api']['$get'], 200>['data']

// `/test` returns 200 with `{ data: { message } }` on success (the route has no 201 path).
export type TestResponse = InferResponseType<ApiClient['api']['test']['$get'], 200>['data']
