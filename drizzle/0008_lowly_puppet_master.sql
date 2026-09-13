CREATE TABLE `v3_analysis_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`data_cutoff` text NOT NULL,
	`payload` text NOT NULL,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_analysis_snapshot_kind_cutoff` ON `v3_analysis_snapshots` (`kind`,`data_cutoff`);--> statement-breakpoint
CREATE TABLE `v3_api_rate_limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier_hash` text NOT NULL,
	`action` text NOT NULL,
	`window_start` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_api_rate_window` ON `v3_api_rate_limits` (`identifier_hash`,`action`,`window_start`);--> statement-breakpoint
CREATE INDEX `idx_v3_api_rate_updated` ON `v3_api_rate_limits` (`updated_at`);--> statement-breakpoint
CREATE TABLE `v3_job_locks` (
	`job_key` text PRIMARY KEY NOT NULL,
	`owner_token` text NOT NULL,
	`locked_until` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_v3_job_lock_expiry` ON `v3_job_locks` (`locked_until`);