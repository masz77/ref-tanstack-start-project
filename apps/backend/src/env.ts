import type { KVNamespace, Queue } from "@cloudflare/workers-types";
import type { AnyD1Database } from "drizzle-orm/d1";

import type { AuthInstance } from "@/auth";
import type { AppEmitter } from "@/infrastructure/events/types";
import type { AuthenticatedUser } from "@/middleware/auth";

export type AppEnv = {
  Bindings: {
    data_151f7d9b365f41d783ed0bf4eeef5086?: AnyD1Database;
    DATABASE?: AnyD1Database;
    KV?: KVNamespace;
    LOGS_API_KEY?: string;
    EVENTS_QUEUE?: Queue<unknown>;
    CORS_ORIGINS?: string | string[];
    CORS_MAX_AGE?: number | string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    STRIPE_SECRET_KEY?: string;
    ASSETS?: { fetch: (request: Request) => Promise<Response> };
  };
  Variables: {
    auth: AuthInstance;
    user?: AuthenticatedUser;
    session?: unknown;
    validatedBody?: unknown;
    validatedQuery?: unknown;
    validatedParams?: unknown;
    uploadedFile?: File;
    emitter: AppEmitter;
  };
};
