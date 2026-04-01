import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Base schema entity with common fields
export const baseEntity = {
  id: text("id").primaryKey().notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
};

// ** KEEP THESE AS-IS **
export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    image: text("image"),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),
    stripeCustomerId: text("stripe_customer_id").unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return [
      index("idx_user_email").on(table.email),
      index("idx_user_created_at").on(table.createdAt),
      index("idx_user_email_verified").on(table.emailVerified),
    ];
  },
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey().notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timezone: text("timezone"),
    city: text("city"),
    country: text("country"),
    region: text("region"),
    regionCode: text("region_code"),
    colo: text("colo"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => {
    return [
      index("idx_session_token").on(table.token),
      index("idx_session_user_id").on(table.userId),
      index("idx_session_expires_at").on(table.expiresAt),
      index("idx_session_user_id_expires_at").on(table.userId, table.expiresAt),
    ];
  },
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey().notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return [
      index("idx_account_user_id").on(table.userId),
      index("idx_account_provider_account").on(table.providerId, table.accountId),
      index("idx_account_access_token_expires_at").on(table.accessTokenExpiresAt),
      index("idx_account_refresh_token_expires_at").on(table.refreshTokenExpiresAt),
    ];
  },
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey().notNull(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  },
  (table) => {
    return [
      index("idx_verification_identifier").on(table.identifier),
      index("idx_verification_value").on(table.value),
      index("idx_verification_expires_at").on(table.expiresAt),
      index("idx_verification_identifier_value").on(table.identifier, table.value),
    ];
  },
);

export const passkey = sqliteTable(
  "passkey",
  {
    id: text("id").primaryKey().notNull(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    webauthnUserID: text("webauthn_user_id"),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    credentialID: text("credential_i_d").notNull(),
    aaguid: text("aaguid"),
  },
  (table) => {
    return [index("idx_passkey_user_id").on(table.userId), index("idx_passkey_created_at").on(table.createdAt)];
  },
);
// ** KEEP THESE AS-IS **

// Stripe Subscription
export const subscription = sqliteTable(
  "subscription",
  {
    id: text("id").primaryKey().notNull(),
    plan: text("plan").notNull(),
    referenceId: text("reference_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    status: text("status").notNull(),
    periodStart: integer("period_start", { mode: "timestamp" }),
    periodEnd: integer("period_end", { mode: "timestamp" }),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" }),
    seats: integer("seats"),
    trialStart: integer("trial_start", { mode: "timestamp" }),
    trialEnd: integer("trial_end", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => {
    return [
      index("idx_subscription_status").on(table.status),
      index("idx_subscription_stripe_customer_id").on(table.stripeCustomerId),
      index("idx_subscription_reference_status").on(table.referenceId, table.status),
    ];
  },
);

export const apiLogs = sqliteTable(
  "_log",
  {
    id: text("id").primaryKey().notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    // Request information
    method: text("method").notNull(),
    url: text("url").notNull(),
    path: text("path").notNull(),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    // Request data
    headers: text("headers"), // JSON as text in SQLite
    queryParams: text("query_params"), // JSON as text in SQLite
    requestBody: text("request_body"), // JSON as text in SQLite
    // Response data
    statusCode: integer("status_code"),
    responseBody: text("response_body"), // JSON as text in SQLite
    responseHeaders: text("response_headers"), // JSON as text in SQLite
    // Timing
    startTime: integer("start_time", { mode: "timestamp" }).notNull(),
    endTime: integer("end_time", { mode: "timestamp" }),
    duration: integer("duration"), // milliseconds
    // Error information
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
  },
  (table) => {
    return [
      index("idx_api_logs_created_at").on(table.createdAt),
      index("idx_api_logs_status_code").on(table.statusCode),
      index("idx_api_logs_method").on(table.method),
      index("idx_api_logs_path").on(table.path),
      // Composite indexes for optimized path-based queries
      index("idx_api_logs_path_created_at").on(table.path, table.createdAt),
      index("idx_api_logs_path_method").on(table.path, table.method),
      index("idx_api_logs_path_status").on(table.path, table.statusCode),
    ];
  },
);
