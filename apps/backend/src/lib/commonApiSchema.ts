
import { z } from "zod";

// =============================================================================
// COMMON RESPONSE WRAPPERS
// =============================================================================

export const successResponseSchema = z.object({
  success: z.boolean(),
}).openapi("SuccessResponse");

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional(),
}).openapi("ErrorResponse");

export const deleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletedId: z.string().uuid(),
  deletedAt: z.string(),
}).openapi("DeleteResponse");

export const paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
}).openapi("Pagination");

// =============================================================================
// BATCH/BULK UPDATE SCHEMAS
// =============================================================================

export const bulkUpdateRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.record(z.any()),
}).openapi("BulkUpdateRequest");

export const bulkUpdateResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    updated: z.array(z.string().uuid()),
    failed: z.array(z.object({
      id: z.string().uuid(),
      error: z.string(),
    })),
    total: z.number(),
    updatedCount: z.number(),
    failedCount: z.number(),
  }),
}).openapi("BulkUpdateResponse");

export const bulkDeleteRequestSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  reason: z.string().optional(),
}).openapi("BulkDeleteRequest");

export const bulkDeleteResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    deleted: z.array(z.string().uuid()),
    failed: z.array(z.object({
      id: z.string().uuid(),
      error: z.string(),
    })),
    total: z.number(),
    deletedCount: z.number(),
    failedCount: z.number(),
  }),
}).openapi("BulkDeleteResponse");

// =============================================================================
// GENERIC UPDATE RESPONSE WRAPPERS
// =============================================================================

// For single resource updates
export const createUpdateResponseWrapper = <T extends z.ZodTypeAny>(schema: T, name: string) => {
  return z.object({
    success: z.boolean(),
    data: schema,
    updatedAt: z.string(),
    changesApplied: z.array(z.string()).optional(),
  }).openapi(`${name}UpdateResponse`);
};

// For list responses with metadata
export const createListResponseWrapper = <T extends z.ZodTypeAny>(schema: T, name: string) => {
  return z.object({
    success: z.boolean(),
    data: z.array(schema),
    pagination: paginationSchema,
    totalCount: z.number().optional(),
    filteredCount: z.number().optional(),
  }).openapi(`${name}ListResponse`);
};

 