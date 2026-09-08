CREATE TABLE `lottery_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`first_prize` text NOT NULL,
	`front_3_1` text,
	`front_3_2` text,
	`last_3_1` text,
	`last_3_2` text,
	`last_2` text NOT NULL,
	`source` text NOT NULL,
	`source_timestamp` text NOT NULL,
	`validation_status` text DEFAULT 'valid' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_lottery_draws_date` ON `lottery_draws` (`draw_date`);--> statement-breakpoint
CREATE TABLE `prediction_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`model_version` text NOT NULL,
	`parameters` text NOT NULL,
	`generated_at` text NOT NULL,
	`locked_at` text
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`number` text NOT NULL,
	`score` real NOT NULL,
	`rank` integer NOT NULL,
	`created_at` text NOT NULL,
	`locked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `prediction_runs`(`id`) ON UPDATE no action ON DELETE no action
);
