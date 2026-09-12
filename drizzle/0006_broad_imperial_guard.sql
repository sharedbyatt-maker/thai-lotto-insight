CREATE TABLE `v3_community_favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`number` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `v3_community_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_favorite` ON `v3_community_favorites` (`user_id`,`number`);--> statement-breakpoint
CREATE TABLE `v3_community_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`subject_id` text NOT NULL,
	`message_key` text NOT NULL,
	`created_at` text NOT NULL,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `v3_community_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_notification` ON `v3_community_notifications` (`user_id`,`type`,`subject_id`);--> statement-breakpoint
CREATE INDEX `idx_v3_community_notification_user` ON `v3_community_notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `v3_community_rate_limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`window_start` text NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `v3_community_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_rate_window` ON `v3_community_rate_limits` (`user_id`,`action`,`window_start`);--> statement-breakpoint
CREATE TABLE `v3_community_settlements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`draw_id` integer NOT NULL,
	`official_last_2` text NOT NULL,
	`result_source_hash` text,
	`metrics_json` text NOT NULL,
	`points` real NOT NULL,
	`settled_at` text NOT NULL,
	`recomputed_at` text,
	`correction_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `v3_community_submissions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`draw_id`) REFERENCES `v3_lottery_draws`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_settlement` ON `v3_community_settlements` (`submission_id`);--> statement-breakpoint
CREATE INDEX `idx_v3_community_settlement_draw` ON `v3_community_settlements` (`draw_id`);--> statement-breakpoint
CREATE TABLE `v3_community_submission_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`submission_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`tens_json` text NOT NULL,
	`units_json` text NOT NULL,
	`exact_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`changed_at` text NOT NULL,
	FOREIGN KEY (`submission_id`) REFERENCES `v3_community_submissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_revision` ON `v3_community_submission_revisions` (`submission_id`,`revision`);--> statement-breakpoint
CREATE TABLE `v3_community_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`target_draw` text NOT NULL,
	`deadline_at` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`tens_json` text NOT NULL,
	`units_json` text NOT NULL,
	`exact_json` text NOT NULL,
	`payload_hash` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`locked_at` text,
	`settled_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `v3_community_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_user_draw` ON `v3_community_submissions` (`user_id`,`target_draw`);--> statement-breakpoint
CREATE INDEX `idx_v3_community_draw_status` ON `v3_community_submissions` (`target_draw`,`status`);--> statement-breakpoint
CREATE INDEX `idx_v3_community_user_draw` ON `v3_community_submissions` (`user_id`,`target_draw`);--> statement-breakpoint
CREATE TABLE `v3_community_users` (
	`id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`display_name` text NOT NULL,
	`joined_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_community_public_id` ON `v3_community_users` (`public_id`);--> statement-breakpoint
CREATE INDEX `idx_v3_community_joined` ON `v3_community_users` (`joined_at`);
--> statement-breakpoint
CREATE TRIGGER `trg_v3_community_expired_insert`
BEFORE INSERT ON `v3_community_submissions`
WHEN strftime('%s','now') >= strftime('%s', NEW.`deadline_at`)
BEGIN SELECT RAISE(ABORT, 'community submission deadline passed'); END;
--> statement-breakpoint
CREATE TRIGGER `trg_v3_community_locked_update`
BEFORE UPDATE OF `tens_json`,`units_json`,`exact_json`,`payload_hash`,`target_draw`,`deadline_at` ON `v3_community_submissions`
WHEN OLD.`status` <> 'open' OR strftime('%s','now') >= strftime('%s', OLD.`deadline_at`)
BEGIN SELECT RAISE(ABORT, 'locked community submission is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER `trg_v3_community_submission_delete`
BEFORE DELETE ON `v3_community_submissions`
BEGIN SELECT RAISE(ABORT, 'community submission audit records cannot be deleted'); END;
