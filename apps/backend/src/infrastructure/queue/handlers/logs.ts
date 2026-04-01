import type { Env } from "@/infrastructure/db";
import { createDb } from "@/infrastructure/db";
import { apiLogs } from "@/infrastructure/db/schema";
import type { LogsCleanupMessage } from "@/infrastructure/queue/types";
import { lt, sql } from "drizzle-orm";

/**
 * Handle log cleanup messages.
 * Deletes old API logs from the database.
 */
export async function handleLogsCleanup(message: LogsCleanupMessage, env: Env): Promise<void> {
  const db = createDb(env);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - message.olderThanDays);

  await db
    .delete(apiLogs)
    .where(lt(apiLogs.createdAt, sql`datetime(${cutoffDate.toISOString()})`))
    .returning({ id: apiLogs.id });
}
