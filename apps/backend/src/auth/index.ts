import type {
  D1Database,
  IncomingRequestCfProperties,
  KVNamespace,
} from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { withCloudflare } from "better-auth-cloudflare";
import { anonymous, openAPI } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";

import type { Env as DatabaseEnv } from "@/db";
import * as schema from "@/db/schema";

export type CloudflareAuthEnv = DatabaseEnv & {
  DB?: D1Database;
  KV_BINDING?: KVNamespace;
};

export function createAuth(
  env?: CloudflareAuthEnv,
  cf?: IncomingRequestCfProperties,
) {
  const d1Binding = env?.DB;

  const db =
    env && d1Binding
      ? drizzle(d1Binding, {
          schema,
          logger: true,
        })
      : ({} as any);

  return betterAuth({
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf: cf || {},
        d1:
          env && d1Binding
            ? {
                db,
                options: {
                  usePlural: false,
                  debugLogs: true,
                },
              }
            : undefined,
        kv: env?.KV_BINDING,
      },
      {
        emailAndPassword: {
          enabled: true,
        },
        plugins: [anonymous(), openAPI()],
        rateLimit: {
          enabled: true,
        },
      },
    ),
    ...(env && d1Binding
      ? {}
      : {
          database: drizzleAdapter({} as D1Database, {
            provider: "sqlite",
            usePlural: false,
            debugLogs: true,
          }),
        }),
  });
}

export type AuthInstance = ReturnType<typeof createAuth>;

export const auth = createAuth();
