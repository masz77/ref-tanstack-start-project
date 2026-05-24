import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";

import type { AppEnv } from "@/env";

export type AppBindings = AppEnv;

// biome-ignore lint/complexity/noBannedTypes: Required by OpenAPIHono generic default
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

// =============================================================================
// API RESPONSE ENVELOPE CONVENTION
// =============================================================================
// Every typed JSON success response is wrapped in a uniform `{ data: T }`
// envelope. These types document that convention for handlers.

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  status: number;
}

// 2026-05-24: Aligned `pagination` shape to the backend's real, consumed Zod
// `paginationSchema` (@/shared/schemas: { page, limit, total, pages }) so the TS
// type and the runtime schema agree. The former shared-package shape used
// `totalPages`, which contradicted the schema; dropped to avoid two sources of truth.
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
