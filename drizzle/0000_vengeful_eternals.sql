CREATE TABLE `metric_hits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`stage` text NOT NULL,
	`unit` text,
	`intent` text,
	`source` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` text NOT NULL,
	`unit` text NOT NULL,
	`type` text NOT NULL,
	`source` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_messages` (
	`wamid` text PRIMARY KEY NOT NULL,
	`received_at` text NOT NULL
);
