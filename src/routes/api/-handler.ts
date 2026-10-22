// why: the pages and the API are served by the same Worker, so the Hono app is mounted
// through the TanStack server routes instead of running as a second deployment. The app
// is imported lazily inside the handler so no server-only module reaches the client bundle.
export async function handleApiRequest({ request }: { request: Request }) {
  const { forwardToApi } = await import('@/server/app')

  return forwardToApi(request)
}
