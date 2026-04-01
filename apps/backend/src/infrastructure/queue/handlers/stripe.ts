import type { Env } from "@/infrastructure/db";
import type { StripeSyncMessage } from "@/infrastructure/queue/types";

/**
 * Handle Stripe sync messages.
 * Placeholder - integrate with Stripe API for subscription/customer syncing.
 */
export async function handleStripeSync(_message: StripeSyncMessage, _env: Env): Promise<void> {}
