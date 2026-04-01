import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";

import type { AppEnv } from "@/env";

export type AppBindings = AppEnv;

// biome-ignore lint/complexity/noBannedTypes: Required by OpenAPIHono generic default
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
