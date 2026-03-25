import type { KVNamespace } from "@cloudflare/workers-types";
import { drizzle, type AnyD1Database, type DrizzleD1Database } from "drizzle-orm/d1";

import * as schema from "./schema";

export interface Env {
  DB?: AnyD1Database;
  KV_BINDING?: KVNamespace;
}

type DatabaseInstance = DrizzleD1Database<typeof schema>;

export function createDb(env: Env): DatabaseInstance {
  const binding = env.DB;
  if (!binding) {
    throw new Error("D1 database binding (DB) is not configured.");
  }
  return drizzle(binding, { schema });
}

export type { DatabaseInstance as CloudflareD1Database };
export default createDb;
