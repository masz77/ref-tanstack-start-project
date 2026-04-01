import type { Env } from "@/infrastructure/db";
import type { EmailSendMessage } from "@/infrastructure/queue/types";

/**
 * Handle email sending messages.
 * Placeholder - integrate with your email service (Resend, SendGrid, etc.)
 */
export async function handleEmailSend(_message: EmailSendMessage, _env: Env): Promise<void> {}
