import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { AuthInstance } from "@/auth";
import type { AuthenticatedUser } from "@/middlewares/auth";
import type { Env as DbEnv } from "@/db";

export interface AppBindings {
  Bindings: DbEnv & {
    CORS_ORIGINS?: string | string[];
    CORS_MAX_AGE?: number | string;
  };
  Variables: {
    auth: AuthInstance;
    user?: AuthenticatedUser;
    session?: unknown;
    validatedBody?: any;
    validatedQuery?: any;
    validatedParams?: any;
    uploadedFile?: File;
  };
};

// eslint-disable-next-line ts/no-empty-object-type
export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
