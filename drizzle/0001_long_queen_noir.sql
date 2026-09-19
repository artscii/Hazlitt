CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL,
	`action` text NOT NULL,
	`record_id` text NOT NULL,
	`name` text NOT NULL,
	`ip` text NOT NULL,
	`before` text,
	`after` text
);
