CREATE TABLE `v3_ml_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`minimum_required` integer NOT NULL,
	`sample_size` integer NOT NULL,
	`split_metadata` text NOT NULL,
	`results` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `v3_optimizer_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`engine_version_id` integer NOT NULL,
	`weights` text NOT NULL,
	`train_range` text NOT NULL,
	`train_count` integer NOT NULL,
	`validation_range` text NOT NULL,
	`validation_count` integer NOT NULL,
	`locked_test_range` text NOT NULL,
	`locked_test_count` integer NOT NULL,
	`train_metrics` text NOT NULL,
	`validation_metrics` text NOT NULL,
	`locked_test_metrics` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`engine_version_id`) REFERENCES `v3_engine_versions`(`id`) ON UPDATE no action ON DELETE no action
);
