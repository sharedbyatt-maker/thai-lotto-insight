CREATE TABLE `v3_full_prize_draws` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `draw_date` text NOT NULL,
  `source_hash` text NOT NULL,
  `completeness` text NOT NULL,
  `source_name` text NOT NULL,
  `source_url` text NOT NULL,
  `verified_at` text NOT NULL,
  `fetched_at` text NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `first_prize` text NOT NULL,
  `last_2` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_full_prize_draw_hash` ON `v3_full_prize_draws` (`draw_date`,`source_hash`);
--> statement-breakpoint
CREATE INDEX `idx_v3_full_prize_active_date` ON `v3_full_prize_draws` (`draw_date`,`is_active`);
--> statement-breakpoint
CREATE TABLE `v3_full_prize_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `draw_date` text NOT NULL,
  `source_hash` text NOT NULL,
  `category` text NOT NULL,
  `winning_number` text NOT NULL,
  `position_index` integer DEFAULT 0 NOT NULL,
  `created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_full_prize_entry` ON `v3_full_prize_entries` (`draw_date`,`source_hash`,`category`,`winning_number`);
--> statement-breakpoint
CREATE INDEX `idx_v3_full_prize_entry_lookup` ON `v3_full_prize_entries` (`draw_date`,`source_hash`,`category`);
--> statement-breakpoint
CREATE TABLE `v3_full_prize_backfill` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `draw_date` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `attempts` integer DEFAULT 0 NOT NULL,
  `last_error` text,
  `last_attempt_at` text,
  `completed_at` text,
  `source_hash` text,
  `completeness` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_v3_full_prize_backfill_date` ON `v3_full_prize_backfill` (`draw_date`);
--> statement-breakpoint
CREATE INDEX `idx_v3_full_prize_backfill_status` ON `v3_full_prize_backfill` (`status`,`draw_date`);
