import { queryOptions } from '@tanstack/react-query'
import { getDatabaseCheck, getHealth, getIndex } from '@/features/health/health.functions'

/**
 * TanStack Query `queryOptions` factories for the health pages.
 *
 * Each queryFn calls a server function, so the response types are inferred from
 * the function's return value (no `{ data }` envelope). A failed server function
 * throws, which React Query surfaces as an error state distinct from an empty result.
 */

export const healthQueryOptions = queryOptions({
  queryKey: ['template', 'health'] as const,
  queryFn: () => getHealth(),
})

export const apiIndexQueryOptions = queryOptions({
  queryKey: ['template', 'index'] as const,
  queryFn: () => getIndex(),
})

export const testQueryOptions = queryOptions({
  queryKey: ['template', 'test'] as const,
  queryFn: () => getDatabaseCheck(),
})
