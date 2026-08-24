CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`nama` text NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'staff' NOT NULL,
	`department` text,
	`capacity_hours_per_month` real DEFAULT 160 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `pic_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` DROP COLUMN `assignee`;