import { z } from "zod";

// =============================================================================
// COMMON RESPONSE WRAPPERS
// =============================================================================

export const successResponseSchema = z
  .object({
    success: z.boolean(),
  })
  .openapi("SuccessResponse");

export const errorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string(),
    details: z.any().optional(),
  })
  .openapi("ErrorResponse");

// 2026-05-24: The shape that the app actually serializes on error. The global
// handler is stoker's `onError` (wired in `create-app.ts` via `app.onError(onError)`),
// which returns `{ message, stack? }` — NOT the `{ success, error, details }` of
// `errorResponseSchema` above, and NOT the `{ error, message, timestamp, path }` of
// the unused `middleware/error-handler.ts`. Documented error responses must use THIS
// schema so Scalar `/reference` matches the real runtime body. `stack` is omitted in
// production but present otherwise, hence optional.
export const httpErrorResponseSchema = z
  .object({
    message: z.string(),
    stack: z.string().optional(),
  })
  .openapi("HttpErrorResponse");

export const deleteResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string(),
    deletedId: z.string().uuid(),
    deletedAt: z.string(),
  })
  .openapi("DeleteResponse");

export const paginationSchema = z
  .object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  })
  .openapi("Pagination");

// =============================================================================
// BATCH/BULK UPDATE SCHEMAS
// =============================================================================

export const bulkUpdateRequestSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    updates: z.record(z.string(), z.any()),
  })
  .openapi("BulkUpdateRequest");

export const bulkUpdateResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      updated: z.array(z.string().uuid()),
      failed: z.array(
        z.object({
          id: z.string().uuid(),
          error: z.string(),
        }),
      ),
      total: z.number(),
      updatedCount: z.number(),
      failedCount: z.number(),
    }),
  })
  .openapi("BulkUpdateResponse");

export const bulkDeleteRequestSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    reason: z.string().optional(),
  })
  .openapi("BulkDeleteRequest");

export const bulkDeleteResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      deleted: z.array(z.string().uuid()),
      failed: z.array(
        z.object({
          id: z.string().uuid(),
          error: z.string(),
        }),
      ),
      total: z.number(),
      deletedCount: z.number(),
      failedCount: z.number(),
    }),
  })
  .openapi("BulkDeleteResponse");

// =============================================================================
// GENERIC UPDATE RESPONSE WRAPPERS
// =============================================================================

// For single resource updates
export const createUpdateResponseWrapper = <T extends z.ZodTypeAny>(schema: T, name: string) => {
  return z
    .object({
      success: z.boolean(),
      data: schema,
      updatedAt: z.string(),
      changesApplied: z.array(z.string()).optional(),
    })
    .openapi(`${name}UpdateResponse`);
};

// For list responses with metadata
export const createListResponseWrapper = <T extends z.ZodTypeAny>(schema: T, name: string) => {
  return z
    .object({
      success: z.boolean(),
      data: z.array(schema),
      pagination: paginationSchema,
      totalCount: z.number().optional(),
      filteredCount: z.number().optional(),
    })
    .openapi(`${name}ListResponse`);
};
