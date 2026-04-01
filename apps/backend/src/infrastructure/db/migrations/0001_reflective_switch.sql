ALTER TABLE `session` ADD `timezone` text;--> statement-breakpoint
ALTER TABLE `session` ADD `city` text;--> statement-breakpoint
ALTER TABLE `session` ADD `country` text;--> statement-breakpoint
ALTER TABLE `session` ADD `region` text;--> statement-breakpoint
ALTER TABLE `session` ADD `region_code` text;--> statement-breakpoint
ALTER TABLE `session` ADD `colo` text;--> statement-breakpoint
ALTER TABLE `session` ADD `latitude` text;--> statement-breakpoint
ALTER TABLE `session` ADD `longitude` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_anonymous` integer DEFAULT false;