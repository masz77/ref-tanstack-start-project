import type { Env } from '@/server/infrastructure/db'
import type { EmailSendMessage } from '@/server/infrastructure/queue/types'

/**
 * Handle email sending messages.
 * Placeholder - integrate with your email service (Resend, SendGrid, etc.)
 */
export async function handleEmailSend(_message: EmailSendMessage, _env: Env): Promise<void> {}
