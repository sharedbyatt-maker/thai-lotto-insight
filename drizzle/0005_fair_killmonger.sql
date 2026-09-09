CREATE TABLE `v3_data_audit_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`draw_count` integer NOT NULL,
	`anomaly_count` integer NOT NULL,
	`anomalies` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_v3_data_audit_completed` ON `v3_data_audit_runs` (`completed_at`);--> statement-breakpoint
CREATE TABLE `v3_provider_health_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider` text NOT NULL,
	`endpoint` text NOT NULL,
	`request_type` text NOT NULL,
	`success` integer NOT NULL,
	`validation_failure` integer DEFAULT false NOT NULL,
	`latency_ms` integer NOT NULL,
	`http_status` integer,
	`error_message` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_v3_provider_health_created` ON `v3_provider_health_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_v3_provider_health_provider` ON `v3_provider_health_events` (`provider`,`created_at`);--> statement-breakpoint
CREATE TRIGGER `trg_v3_locked_run_update`
BEFORE UPDATE ON `v3_prediction_runs`
WHEN OLD.`locked_at` <> ''
BEGIN
	SELECT RAISE(ABORT, 'locked prediction run is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_v3_locked_run_delete`
BEFORE DELETE ON `v3_prediction_runs`
WHEN OLD.`locked_at` <> ''
BEGIN
	SELECT RAISE(ABORT, 'locked prediction run is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_v3_locked_pick_insert`
BEFORE INSERT ON `v3_predictions`
WHEN COALESCE((SELECT `locked_at` FROM `v3_prediction_runs` WHERE `id` = NEW.`run_id`), '') <> ''
BEGIN
	SELECT RAISE(ABORT, 'locked prediction picks are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_v3_locked_pick_update`
BEFORE UPDATE ON `v3_predictions`
WHEN COALESCE((SELECT `locked_at` FROM `v3_prediction_runs` WHERE `id` = OLD.`run_id`), '') <> ''
BEGIN
	SELECT RAISE(ABORT, 'locked prediction picks are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_v3_locked_pick_delete`
BEFORE DELETE ON `v3_predictions`
WHEN COALESCE((SELECT `locked_at` FROM `v3_prediction_runs` WHERE `id` = OLD.`run_id`), '') <> ''
BEGIN
	SELECT RAISE(ABORT, 'locked prediction picks are immutable');
END;
