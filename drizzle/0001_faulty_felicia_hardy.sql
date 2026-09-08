CREATE TABLE `v3_backtest_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`backtest_run_id` integer NOT NULL,
	`draw_date` text NOT NULL,
	`data_cutoff` text NOT NULL,
	`actual_result` text NOT NULL,
	`rank` integer,
	`top_picks` text NOT NULL,
	FOREIGN KEY (`backtest_run_id`) REFERENCES `v3_backtest_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `v3_backtest_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`engine_version_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`sample_size` integer NOT NULL,
	`top_1_rate` real NOT NULL,
	`top_3_rate` real NOT NULL,
	`top_5_rate` real NOT NULL,
	`top_10_rate` real NOT NULL,
	`split_metadata` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`engine_version_id`) REFERENCES `v3_engine_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `v3_engine_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` text NOT NULL,
	`parameters` text NOT NULL,
	`description` text NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_engine_version` ON `v3_engine_versions` (`version`);--> statement-breakpoint
CREATE TABLE `v3_lottery_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`first_prize` text NOT NULL,
	`front_3_1` text NOT NULL,
	`front_3_2` text NOT NULL,
	`last_3_1` text NOT NULL,
	`last_3_2` text NOT NULL,
	`last_2` text NOT NULL,
	`source_name` text NOT NULL,
	`source_timestamp` text,
	`validation_status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_draw_date` ON `v3_lottery_draws` (`draw_date`);--> statement-breakpoint
CREATE INDEX `idx_v3_draw_date` ON `v3_lottery_draws` (`draw_date`);--> statement-breakpoint
CREATE TABLE `v3_number_statistics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`number` text NOT NULL,
	`period` text NOT NULL,
	`appearances` integer NOT NULL,
	`recent_appearances` integer NOT NULL,
	`last_seen_draws_ago` integer,
	`average_gap` real,
	`gap_percentile` real,
	`recent_frequency_score` real NOT NULL,
	`long_term_frequency_score` real NOT NULL,
	`gap_score` real NOT NULL,
	`pair_score` real NOT NULL,
	`position_score` real NOT NULL,
	`momentum_score` real NOT NULL,
	`final_score` real NOT NULL,
	`sample_size` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_number_period` ON `v3_number_statistics` (`number`,`period`);--> statement-breakpoint
CREATE TABLE `v3_prediction_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prediction_run_id` integer NOT NULL,
	`actual_result` text NOT NULL,
	`matched_rank` integer,
	`hit_top_1` integer NOT NULL,
	`hit_top_3` integer NOT NULL,
	`hit_top_5` integer NOT NULL,
	`hit_top_10` integer NOT NULL,
	`evaluated_at` text NOT NULL,
	FOREIGN KEY (`prediction_run_id`) REFERENCES `v3_prediction_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_prediction_result` ON `v3_prediction_results` (`prediction_run_id`);--> statement-breakpoint
CREATE TABLE `v3_prediction_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`engine_version_id` integer NOT NULL,
	`parameters` text NOT NULL,
	`data_cutoff` text NOT NULL,
	`generated_at` text NOT NULL,
	`locked_at` text NOT NULL,
	FOREIGN KEY (`engine_version_id`) REFERENCES `v3_engine_versions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_prediction_draw` ON `v3_prediction_runs` (`draw_date`);--> statement-breakpoint
CREATE TABLE `v3_predictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` integer NOT NULL,
	`number` text NOT NULL,
	`score` real NOT NULL,
	`component_scores` text NOT NULL,
	`rank` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `v3_prediction_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_prediction_number` ON `v3_predictions` (`run_id`,`number`);--> statement-breakpoint
CREATE INDEX `idx_v3_prediction_rank` ON `v3_predictions` (`run_id`,`rank`);--> statement-breakpoint
CREATE TABLE `v3_sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`imported_count` integer DEFAULT 0 NOT NULL,
	`invalid_count` integer DEFAULT 0 NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE TABLE `v3_system_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`level` text NOT NULL,
	`event_type` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_v3_events_created` ON `v3_system_events` (`created_at`);--> statement-breakpoint
DROP TABLE `lottery_draws`;--> statement-breakpoint
DROP TABLE `prediction_runs`;--> statement-breakpoint
DROP TABLE `predictions`;