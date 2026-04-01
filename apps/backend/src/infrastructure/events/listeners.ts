import type { QueueMessage } from "@/infrastructure/queue/types";
import type { Context, Env } from "hono";
import type { AuthSessionCreatedEvent, SubscriptionChangedEvent, UserCreatedEvent, UserDeletedEvent } from "./types";

// Type alias for the bindings we need from context
type EventContext = Context<Env & { Bindings: { EVENTS_QUEUE?: { send: (msg: unknown) => Promise<void> } } }>;

/**
 * Safely queue a message with graceful fallback if queue is unavailable.
 * Logs to console when queue is not configured (local dev).
 */
export async function safeQueue(c: EventContext, message: QueueMessage): Promise<boolean> {
  const queue = (c.env as { EVENTS_QUEUE?: { send: (msg: unknown) => Promise<void> } }).EVENTS_QUEUE;

  if (!queue) {
    return false;
  }

  try {
    await queue.send(message);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a correlation ID for tracking events across systems.
 */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Listener for user:created events.
 * Logs the event and queues a welcome email.
 */
export function onUserCreated(c: Context, payload: UserCreatedEvent): void {
  // Queue welcome email (fire and forget)
  safeQueue(c as EventContext, {
    type: "email:send",
    to: payload.email,
    template: "welcome",
    data: {
      name: payload.name,
      userId: payload.userId,
    },
    correlationId: generateCorrelationId(),
  });
}

/**
 * Listener for user:deleted events.
 * Logs the deletion for audit purposes.
 */
export function onUserDeleted(_c: Context, _payload: UserDeletedEvent): void {
  // Could queue cleanup tasks here if needed
}

/**
 * Listener for auth:session-created events.
 * Logs session creation for security monitoring.
 */
export function onAuthSessionCreated(_c: Context, _payload: AuthSessionCreatedEvent): void {
  // Could queue security notifications or analytics here
}

/**
 * Listener for subscription:changed events.
 * Logs the change and queues Stripe sync.
 */
export function onSubscriptionChanged(c: Context, payload: SubscriptionChangedEvent): void {
  // Queue Stripe sync
  safeQueue(c as EventContext, {
    type: "stripe:sync",
    userId: payload.userId,
    customerId: payload.customerId,
    action: "sync-subscription",
    correlationId: generateCorrelationId(),
  });
}
