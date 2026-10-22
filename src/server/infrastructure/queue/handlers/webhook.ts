import type { Env } from '@/server/infrastructure/db'
import type { WebhookProcessMessage } from '@/server/infrastructure/queue/types'

/**
 * Handle webhook processing messages.
 * Placeholder - implement custom webhook processing logic.
 */
export async function handleWebhookProcess(
  _message: WebhookProcessMessage,
  _env: Env,
): Promise<void> {}
