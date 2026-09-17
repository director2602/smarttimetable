CREATE TABLE `batch_time_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`time_slot_id` text NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`time_slot_id`) REFERENCES `time_slots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_time_slot_uq` ON `batch_time_slots` (`batch_id`,`time_slot_id`);