CREATE TABLE `v3_import_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`candidate_date` text NOT NULL,
	`slot_date` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`last_attempt_at` text,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_import_candidate` ON `v3_import_queue` (`candidate_date`);--> statement-breakpoint
CREATE INDEX `idx_v3_import_status` ON `v3_import_queue` (`status`);--> statement-breakpoint
CREATE TABLE `v3_rejected_draws` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`requested_date` text,
	`reported_date` text,
	`provider` text NOT NULL,
	`source_url` text NOT NULL,
	`reason` text NOT NULL,
	`raw_payload` text,
	`payload_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_v3_rejected_date` ON `v3_rejected_draws` (`requested_date`);--> statement-breakpoint
CREATE TABLE `v3_source_verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_date` text NOT NULL,
	`source_type` text NOT NULL,
	`source_url` text NOT NULL,
	`status` text NOT NULL,
	`checked_fields` text NOT NULL,
	`notes` text,
	`verified_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_verification` ON `v3_source_verifications` (`draw_date`,`source_url`);--> statement-breakpoint
ALTER TABLE `v3_lottery_draws` ADD `source_url` text;--> statement-breakpoint
ALTER TABLE `v3_lottery_draws` ADD `source_resource_id` text;--> statement-breakpoint
ALTER TABLE `v3_lottery_draws` ADD `source_hash` text;--> statement-breakpoint
ALTER TABLE `v3_lottery_draws` ADD `verification_status` text DEFAULT 'api_validated' NOT NULL;--> statement-breakpoint
ALTER TABLE `v3_sync_runs` ADD `duplicate_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `v3_sync_runs` ADD `processed_count` integer DEFAULT 0 NOT NULL;