CREATE TABLE `analytics_daily` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`day` text NOT NULL,
	`country` text NOT NULL,
	`device` text NOT NULL,
	`project` text NOT NULL,
	`visits` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_views` (
	`id` text PRIMARY KEY NOT NULL,
	`visit` text NOT NULL,
	`period` text NOT NULL,
	`at` integer NOT NULL,
	`project` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`at` integer NOT NULL,
	`last` integer NOT NULL,
	`country` text NOT NULL,
	`device` text NOT NULL
);
