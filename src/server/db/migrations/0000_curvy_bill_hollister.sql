CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`traditional` text NOT NULL,
	`simplified` text NOT NULL,
	`pinyin` text NOT NULL,
	`pinyin_search` text NOT NULL,
	`zhuyin` text NOT NULL,
	`definition` text NOT NULL,
	`hsk_level` integer,
	`frequency_rank` integer,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `characters_traditional_unique` ON `characters` (`traditional`);--> statement-breakpoint
CREATE UNIQUE INDEX `characters_traditional_idx` ON `characters` (`traditional`);--> statement-breakpoint
CREATE INDEX `characters_hsk_level_idx` ON `characters` (`hsk_level`);--> statement-breakpoint
CREATE INDEX `characters_simplified_idx` ON `characters` (`simplified`);--> statement-breakpoint
CREATE INDEX `characters_pinyin_search_idx` ON `characters` (`pinyin_search`);--> statement-breakpoint
CREATE TABLE `example_sentences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`character_id` integer NOT NULL,
	`traditional` text NOT NULL,
	`simplified` text NOT NULL,
	`pinyin` text,
	`zhuyin` text,
	`translation` text NOT NULL,
	`notes` text,
	`sort_order` integer DEFAULT 0,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sentences_character_id_idx` ON `example_sentences` (`character_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`character_id` integer NOT NULL,
	`rating` text NOT NULL,
	`reviewed_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reviews_user_character_idx` ON `reviews` (`user_id`,`character_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`display_name` text,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);