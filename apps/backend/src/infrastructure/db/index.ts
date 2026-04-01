import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";

import type { AppEnv } from "@/env";

import * as schema from "./schema";

export type Env = Pick<
  AppEnv["Bindings"],
  "data_151f7d9b365f41d783ed0bf4eeef5086" | "DATABASE" | "KV" | "LOGS_API_KEY" | "EVENTS_QUEUE"
>;

type DatabaseInstance = DrizzleD1Database<typeof schema>;

export function createDb(env: Env): DatabaseInstance {
  const binding = env.DATABASE ?? env.data_151f7d9b365f41d783ed0bf4eeef5086;
  if (!binding) {
    throw new Error("D1 database binding is not configured.");
  }
  return drizzle(binding, { schema });
}

export type { DatabaseInstance as CloudflareD1Database };
export default createDb;
