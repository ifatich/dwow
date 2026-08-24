PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`subtask_id` text NOT NULL,
	`staff_name` text NOT NULL,
	`action` text NOT NULL,
	`timestamp` text NOT NULL,
	`duration_hours` real DEFAULT 0 NOT NULL,
	`note` text,
	FOREIGN KEY (`subtask_id`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_activity_logs`("id", "subtask_id", "staff_name", "action", "timestamp", "duration_hours", "note") SELECT "id", "subtask_id", "staff_name", "action", "timestamp", "duration_hours", "note" FROM `activity_logs`;--> statement-breakpoint
DROP TABLE `activity_logs`;--> statement-breakpoint
ALTER TABLE `__new_activity_logs` RENAME TO `activity_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_subtasks` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`goals` text,
	`dod` text,
	`evidence` text,
	`done` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'to_do' NOT NULL,
	`workload_hours` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_subtasks`("id", "task_id", "title", "description", "goals", "dod", "evidence", "done", "status", "workload_hours", "created_at", "updated_at") SELECT "id", "task_id", "title", "description", "goals", "dod", "evidence", "done", "status", "workload_hours", "created_at", "updated_at" FROM `subtasks`;--> statement-breakpoint
DROP TABLE `subtasks`;--> statement-breakpoint
ALTER TABLE `__new_subtasks` RENAME TO `subtasks`;--> statement-breakpoint
CREATE TABLE `__new_time_contributions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subtask_id` text NOT NULL,
	`staff_name` text NOT NULL,
	`hours` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`subtask_id`) REFERENCES `subtasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_time_contributions`("id", "subtask_id", "staff_name", "hours") SELECT "id", "subtask_id", "staff_name", "hours" FROM `time_contributions`;--> statement-breakpoint
DROP TABLE `time_contributions`;--> statement-breakpoint
ALTER TABLE `__new_time_contributions` RENAME TO `time_contributions`;