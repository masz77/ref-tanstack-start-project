// Email Messages
export type EmailSendMessage = {
  type: "email:send";
  to: string;
  template: "welcome" | "password-reset" | "verification" | "notification";
  data: Record<string, unknown>;
  correlationId: string;
};

// Stripe Sync Messages
export type StripeSyncMessage = {
  type: "stripe:sync";
  userId: string;
  customerId: string;
  action: "sync-subscription" | "sync-customer" | "sync-payment-method";
  correlationId: string;
};

// Webhook Processing Messages
export type WebhookProcessMessage = {
  type: "webhook:process";
  webhookId: string;
  payload: Record<string, unknown>;
  source: string;
  correlationId: string;
};

// Discriminated union of all queue messages
export type QueueMessage = EmailSendMessage | StripeSyncMessage | WebhookProcessMessage;

// Helper type for message by type
export type QueueMessageByType<T extends QueueMessage["type"]> = Extract<QueueMessage, { type: T }>;
