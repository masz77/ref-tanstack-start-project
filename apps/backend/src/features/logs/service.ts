import { and, avg, count, desc, eq, gte, lt, lte, sql, sum } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { type CacheService, createCacheService } from "@/infrastructure/cache";
import createDb, { type CloudflareD1Database, type Env as DbEnv } from "@/infrastructure/db";
import { apiLogs } from "@/infrastructure/db/schema";
import type { AuthenticatedUser } from "@/middleware/auth";

export interface LogFilters {
  page?: number;
  limit?: number;
  method?: string;
  statusCode?: number;
  path?: string;
  fromDate?: string;
  toDate?: string;
}

export interface LogData {
  // Request information
  method: string;
  url: string;
  path: string;
  userAgent?: string;
  ipAddress?: string;

  // User context
  user?: AuthenticatedUser;

  // Request data
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: any;

  // Response data
  statusCode?: number;
  responseBody?: any;
  responseHeaders?: Record<string, string>;

  // Timing
  startTime: string | number | Date;
  endTime?: string | number | Date;
  duration?: number;

  // Error information
  errorMessage?: string;
  errorStack?: string;
}

const INSERT_CHUNK_SIZE = 50;
const CACHE_TTL = 5 * 60; // 5 minutes in seconds

function toDateValue(value?: string | number | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toInsertPayload(log: LogData) {
  const startTime = toDateValue(log.startTime) ?? new Date();
  const endTime = toDateValue(log.endTime);

  return {
    id: crypto.randomUUID(),
    method: log.method,
    url: log.url,
    path: log.path,
    userAgent: log.userAgent,
    ipAddress: log.ipAddress,
    headers: log.headers ? JSON.stringify(log.headers) : null,
    queryParams: log.queryParams ? JSON.stringify(log.queryParams) : null,
    requestBody: log.requestBody ? JSON.stringify(log.requestBody) : null,
    statusCode: log.statusCode,
    responseBody: log.responseBody ? JSON.stringify(log.responseBody) : null,
    responseHeaders: log.responseHeaders ? JSON.stringify(log.responseHeaders) : null,
    startTime,
    endTime: endTime ?? null,
    duration: log.duration,
    errorMessage: log.errorMessage,
    errorStack: log.errorStack,
  };
}

async function insertLogs(database: CloudflareD1Database, logs: LogData[]) {
  for (let i = 0; i < logs.length; i += INSERT_CHUNK_SIZE) {
    const chunk = logs.slice(i, i + INSERT_CHUNK_SIZE).map(toInsertPayload);
    await database.insert(apiLogs).values(chunk);
  }
}

export function createLogsService(env: DbEnv) {
  const database = createDb(env);
  const cacheService: CacheService = createCacheService(env);

  return {
    async addLog(data: LogData): Promise<void> {
      try {
        await insertLogs(database, [data]);
        await cacheService.flushAll();
      } catch (error) {}
    },

    queueLog(data: LogData): void {
      void insertLogs(database, [data])
        .then(() => cacheService.flushAll())
        .catch((_error) => {});
    },

    async addLogs(logs: LogData[]): Promise<void> {
      if (logs.length === 0) return;

      try {
        await insertLogs(database, logs);
        await cacheService.flushAll();
      } catch (error) {}
    },

    async getLogById(id: string) {
      const cacheKey = `log:${id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const log = await database.select().from(apiLogs).where(eq(apiLogs.id, id)).limit(1);

      if (log.length === 0) {
        throw new HTTPException(404, { message: "Log entry not found" });
      }

      const result = {
        ...log[0],
        headers: log[0].headers ? JSON.parse(log[0].headers) : null,
        queryParams: log[0].queryParams ? JSON.parse(log[0].queryParams) : null,
        requestBody: log[0].requestBody ? JSON.parse(log[0].requestBody) : null,
        responseBody: log[0].responseBody ? JSON.parse(log[0].responseBody) : null,
        responseHeaders: log[0].responseHeaders ? JSON.parse(log[0].responseHeaders) : null,
      };

      await cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      return result;
    },

    async getLogsByPath(
      path: string,
      options: {
        page?: number;
        limit?: number;
        method?: string;
        statusCode?: number;
        fromDate?: string;
        toDate?: string;
      } = {},
    ) {
      const { page = 1, limit = 20, method, statusCode, fromDate, toDate } = options;

      const conditions = [eq(apiLogs.path, path)];

      if (method) {
        conditions.push(eq(apiLogs.method, method.toUpperCase()));
      }

      if (statusCode) {
        conditions.push(eq(apiLogs.statusCode, statusCode));
      }

      if (fromDate) {
        const fromTimestamp = new Date(fromDate);
        conditions.push(gte(apiLogs.createdAt, fromTimestamp));
      }

      if (toDate) {
        const toTimestamp = new Date(toDate);
        conditions.push(lte(apiLogs.createdAt, toTimestamp));
      }

      const whereClause = and(...conditions);

      const cacheKey = `path:${path}:${JSON.stringify(options)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const [{ total }] = await database.select({ total: count() }).from(apiLogs).where(whereClause);

      const offset = (page - 1) * limit;
      const results = await database
        .select({
          id: apiLogs.id,
          method: apiLogs.method,
          url: apiLogs.url,
          path: apiLogs.path,
          statusCode: apiLogs.statusCode,
          duration: apiLogs.duration,
          userAgent: apiLogs.userAgent,
          ipAddress: apiLogs.ipAddress,
          requestHeaders: apiLogs.headers,
          requestBody: apiLogs.requestBody,
          responseBody: apiLogs.responseBody,
          responseHeaders: apiLogs.responseHeaders,
          errorMessage: apiLogs.errorMessage,
          createdAt: apiLogs.createdAt,
        })
        .from(apiLogs)
        .where(whereClause)
        .orderBy(desc(apiLogs.createdAt))
        .limit(limit)
        .offset(offset);

      const parsedResults = results.map((result) => ({
        ...result,
        requestHeaders: result.requestHeaders ? JSON.parse(result.requestHeaders) : null,
        requestBody: result.requestBody ? JSON.parse(result.requestBody) : null,
        responseBody: result.responseBody ? JSON.parse(result.responseBody) : null,
        responseHeaders: result.responseHeaders ? JSON.parse(result.responseHeaders) : null,
      }));

      const response = {
        data: parsedResults,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: {
          path,
          totalRequests: total,
          ...(method && { method }),
          ...(statusCode && { statusCode }),
        },
      };

      if (total > 0) {
        await cacheService.set(cacheKey, JSON.stringify(response), CACHE_TTL);
      }

      return response;
    },

    async getLogsStats() {
      const cacheKey = "logs:stats";
      const cached = await cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const stats = await database
        .select({
          total: count(),
          errors: sum(sql`CASE WHEN ${apiLogs.statusCode} >= 400 THEN 1 ELSE 0 END`),
          avgDuration: avg(apiLogs.duration),
          minDuration: sql`MIN(${apiLogs.duration})`,
          maxDuration: sql`MAX(${apiLogs.duration})`,
          totalRequests24h: sum(sql`CASE WHEN ${apiLogs.createdAt} >= datetime('now', '-1 day') THEN 1 ELSE 0 END`),
        })
        .from(apiLogs);

      const result = {
        ...stats[0],
        errorRate: stats[0].total ? ((Number(stats[0].errors) / stats[0].total) * 100).toFixed(2) : "0.00",
      };

      await cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      return result;
    },

    async getLogsStatsForRange(fromDate: string, toDate: string) {
      const fromTimestamp = new Date(fromDate);
      const toTimestamp = new Date(toDate);

      const stats = await database
        .select({
          total: count(),
          errors: sum(sql`CASE WHEN ${apiLogs.statusCode} >= 400 THEN 1 ELSE 0 END`),
          avgDuration: avg(apiLogs.duration),
          minDuration: sql`MIN(${apiLogs.duration})`,
          maxDuration: sql`MAX(${apiLogs.duration})`,
        })
        .from(apiLogs)
        .where(and(gte(apiLogs.createdAt, fromTimestamp), lte(apiLogs.createdAt, toTimestamp)));

      return {
        ...stats[0],
        errorRate: stats[0].total ? ((Number(stats[0].errors) / stats[0].total) * 100).toFixed(2) : "0.00",
        dateRange: { from: fromDate, to: toDate },
      };
    },

    async getEndpointMetrics(limit = 10) {
      const cacheKey = `endpoint:metrics:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const metrics = await database
        .select({
          path: apiLogs.path,
          method: apiLogs.method,
          totalRequests: count(),
          avgDuration: avg(apiLogs.duration),
          minDuration: sql`MIN(${apiLogs.duration})`,
          maxDuration: sql`MAX(${apiLogs.duration})`,
          errorCount: sum(sql`CASE WHEN ${apiLogs.statusCode} >= 400 THEN 1 ELSE 0 END`),
        })
        .from(apiLogs)
        .groupBy(apiLogs.path, apiLogs.method)
        .orderBy(desc(count()))
        .limit(limit);

      const result = metrics.map((metric) => ({
        ...metric,
        errorRate: metric.totalRequests
          ? ((Number(metric.errorCount) / metric.totalRequests) * 100).toFixed(2)
          : "0.00",
      }));

      await cacheService.set(cacheKey, JSON.stringify(result), CACHE_TTL);
      return result;
    },

    async clearCache(): Promise<void> {
      await cacheService.flushAll();
    },

    async getRecentLogs(limit = 50) {
      const cacheKey = `recent:logs:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const results = await database
        .select({
          id: apiLogs.id,
          method: apiLogs.method,
          path: apiLogs.path,
          statusCode: apiLogs.statusCode,
          duration: apiLogs.duration,
          createdAt: apiLogs.createdAt,
        })
        .from(apiLogs)
        .orderBy(desc(apiLogs.createdAt))
        .limit(limit);

      await cacheService.set(cacheKey, JSON.stringify(results), CACHE_TTL);
      return results;
    },

    async cleanupOldLogs(daysToKeep = 30): Promise<number> {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      try {
        const [{ total: rowsToDelete }] = await database
          .select({ total: count() })
          .from(apiLogs)
          .where(lt(apiLogs.createdAt, cutoffDate));

        const toDelete = Number(rowsToDelete) || 0;
        if (toDelete === 0) {
          return 0;
        }

        await database.delete(apiLogs).where(lt(apiLogs.createdAt, cutoffDate));
        await cacheService.flushAll();
        return toDelete;
      } catch (error) {
        return 0;
      }
    },

    async getConnectionInfo() {
      try {
        const pragmaInfo = await database.all(sql`PRAGMA database_list`);
        const cacheInfo = await database.all(sql`PRAGMA cache_size`);
        const journalMode = await database.all(sql`PRAGMA journal_mode`);

        return {
          database: pragmaInfo,
          cacheSize: cacheInfo,
          journalMode,
        };
      } catch (error) {
        return null;
      }
    },
  };
}

export type LogsService = ReturnType<typeof createLogsService>;
