CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_account_user_id` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_account_provider_account` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `idx_account_access_token_expires_at` ON `account` (`access_token_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_account_refresh_token_expires_at` ON `account` (`refresh_token_expires_at`);--> statement-breakpoint
CREATE TABLE `_log` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`method` text NOT NULL,
	`url` text NOT NULL,
	`path` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`headers` text,
	`query_params` text,
	`request_body` text,
	`status_code` integer,
	`response_body` text,
	`response_headers` text,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`duration` integer,
	`error_message` text,
	`error_stack` text
);
--> statement-breakpoint
CREATE INDEX `idx_api_logs_created_at` ON `_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_status_code` ON `_log` (`status_code`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_method` ON `_log` (`method`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_path` ON `_log` (`path`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_path_created_at` ON `_log` (`path`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_path_method` ON `_log` (`path`,`method`);--> statement-breakpoint
CREATE INDEX `idx_api_logs_path_status` ON `_log` (`path`,`status_code`);--> statement-breakpoint
CREATE TABLE `passkey` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` text NOT NULL,
	`webauthn_user_id` text,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`created_at` integer NOT NULL,
	`credential_i_d` text NOT NULL,
	`aaguid` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_passkey_user_id` ON `passkey` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_passkey_created_at` ON `passkey` (`created_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_token` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires_at` ON `session` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_session_user_id_expires_at` ON `session` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`reference_id` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`status` text NOT NULL,
	`period_start` integer,
	`period_end` integer,
	`cancel_at_period_end` integer,
	`seats` integer,
	`trial_start` integer,
	`trial_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reference_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_stripe_subscription_id_unique` ON `subscription` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_subscription_status` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `idx_subscription_stripe_customer_id` ON `subscription` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_subscription_reference_status` ON `subscription` (`reference_id`,`status`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`stripe_customer_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_stripe_customer_id_unique` ON `user` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `idx_user_email` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `idx_user_created_at` ON `user` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_user_email_verified` ON `user` (`email_verified`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_verification_identifier` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `idx_verification_value` ON `verification` (`value`);--> statement-breakpoint
CREATE INDEX `idx_verification_expires_at` ON `verification` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_verification_identifier_value` ON `verification` (`identifier`,`value`);