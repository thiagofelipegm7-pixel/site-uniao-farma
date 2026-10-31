CREATE TABLE IF NOT EXISTS `click_counts` (
	`day` text NOT NULL,
	`path` text NOT NULL,
	`button` text NOT NULL,
	`store` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `path`, `button`, `store`)
);
