import type { Emitter } from "@hono/event-emitter";

// User Events
export type UserCreatedEvent = {
  userId: string;
  email: string;
  name: string | null;
};

export type UserDeletedEvent = {
  userId: string;
  email: string;
};

// Auth Events
export type AuthSessionCreatedEvent = {
  userId: string;
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
};

// Subscription Events
export type SubscriptionChangedEvent = {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId: string | null;
};

// Discriminated union of all events
export type AppEvents = {
  "user:created": UserCreatedEvent;
  "user:deleted": UserDeletedEvent;
  "auth:session-created": AuthSessionCreatedEvent;
  "subscription:changed": SubscriptionChangedEvent;
};

// Type alias for the emitter
export type AppEmitter = Emitter<AppEvents>;
