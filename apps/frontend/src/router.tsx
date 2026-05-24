import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { NotFound } from '@/components/not-found'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

// DECISION: module-level singleton so __root.tsx's QueryClientProvider and the
// router context share ONE instance. Route loaders prime this cache and the
// components that read it (via hooks) hit the same client — a per-render client
// would split the cache and break that handoff.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: NotFound,
  })

  return router
}
