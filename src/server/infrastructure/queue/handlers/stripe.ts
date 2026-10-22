import type { Env } from '@/server/infrastructure/db'
import type { StripeSyncMessage } from '@/server/infrastructure/queue/types'

/**
 * Handle Stripe sync messages.
 * Placeholder - integrate with Stripe API for subscription/customer syncing.
 */
export async function handleStripeSync(_message: StripeSyncMessage, _env: Env): Promise<void> {}
