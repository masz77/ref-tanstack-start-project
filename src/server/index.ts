import type { ExecutionContext, MessageBatch } from '@cloudflare/workers-types'
import type { Env } from '@/server/infrastructure/db'
import { handleQueue } from '@/server/infrastructure/queue/handler'
import type { QueueMessage } from '@/server/infrastructure/queue/types'
import { buildApp } from './app'

export type { AppType } from './app'

const app = buildApp()

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<QueueMessage>, env: Env, _ctx: ExecutionContext): Promise<void> {
    await handleQueue(batch, env)
  },
}
