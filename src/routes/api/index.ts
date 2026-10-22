import { createFileRoute } from '@tanstack/react-router'
import { handleApiRequest } from './-handler'

// why: the splat route `/api/$` needs a non-empty segment, so bare `/api` gets its own server route.
export const Route = createFileRoute('/api/')({
  server: {
    // why: ANY lets OPTIONS/HEAD reach Hono instead of getting a TanStack 404.
    handlers: { ANY: handleApiRequest },
  },
})
