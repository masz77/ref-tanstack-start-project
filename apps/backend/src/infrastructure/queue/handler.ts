import type { Env } from "@/infrastructure/db";
import type { MessageBatch } from "@cloudflare/workers-types";
import { handleEmailSend } from "./handlers/email";
import { handleLogsCleanup } from "./handlers/logs";
import { handleStripeSync } from "./handlers/stripe";
import { handleWebhookProcess } from "./handlers/webhook";
import type { QueueMessage } from "./types";

const MAX_RETRIES = 3;

/**
 * Calculate exponential backoff delay in seconds.
 * 1st retry: 60s, 2nd: 120s, 3rd: 240s
 */
function getRetryDelay(attempts: number): number {
  return 2 ** attempts * 60;
}

/**
 * Process a single queue message.
 */
async function processMessage(message: QueueMessage, env: Env): Promise<void> {
  switch (message.type) {
    case "email:send":
      await handleEmailSend(message, env);
      break;
    case "stripe:sync":
      await handleStripeSync(message, env);
      break;
    case "webhook:process":
      await handleWebhookProcess(message, env);
      break;
    case "logs:cleanup":
      await handleLogsCleanup(message, env);
      break;
    default: {
      // Type-safe exhaustive check
      void (message as never);
    }
  }
}

/**
 * Handle a batch of queue messages.
 * Implements exponential backoff retry with DLQ behavior after max retries.
 */
export async function handleQueue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
  for (const msg of batch.messages) {
    const message = msg.body;
    const attempts = msg.attempts;

    try {
      await processMessage(message, env);
      msg.ack();
    } catch (error) {
      if (attempts >= MAX_RETRIES) {
        msg.ack();
      } else {
        // Retry with exponential backoff
        const delaySeconds = getRetryDelay(attempts);
        msg.retry({ delaySeconds });
      }
    }
  }
}
