import { createRouter } from '@/server/lib/create-app'

const router = createRouter()

// why: mounted under the app's /api base path, so the full path is /api/auth/*.
router.all('/auth/*', async (c) => {
  const auth = c.get('auth')
  return auth.handler(c.req.raw)
})

export default router
