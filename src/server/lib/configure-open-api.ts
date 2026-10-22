import { Scalar } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from '@/server/shared/types'
import packageJSON from '../../../package.json' with { type: 'json' }

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc('/doc', {
    openapi: '3.0.0',
    info: {
      version: packageJSON.version,
      title: 'Tasks API',
    },
  })

  app.get(
    '/reference',
    Scalar({
      // 2026-10-22: the API moved under the /api base path, so the spec lives at /api/doc.
      url: '/api/doc',
      theme: 'kepler',
      layout: 'classic',
      defaultHttpClient: {
        targetKey: 'js',
        clientKey: 'fetch',
      },
    }),
  )
}
