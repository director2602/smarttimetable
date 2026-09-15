CREATE TABLE `academic_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`metadata` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batch_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`start_time` text,
	`end_time` text,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batch_subject_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`classes_per_week` integer NOT NULL,
	`min_gap_days` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`course_id` text NOT NULL,
	`academic_session_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`student_count` integer DEFAULT 0 NOT NULL,
	`max_classes_per_day` integer DEFAULT 6 NOT NULL,
	`max_consecutive_classes` integer DEFAULT 3 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`employee_id` text NOT NULL,
	`email` text,
	`phone` text,
	`max_classes_per_day` integer DEFAULT 6 NOT NULL,
	`max_classes_per_week` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`start_time` text,
	`end_time` text,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`batch_id` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty_blocked_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`date` text,
	`day_of_week` integer,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `faculty_subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`faculty_id` text NOT NULL,
	`subject_id` text NOT NULL,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `holidays` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`date` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `institute_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`institute_name` text NOT NULL,
	`logo_url` text,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`accepted_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `room_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`start_time` text,
	`end_time` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `room_blocked_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`date` text,
	`day_of_week` integer,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`capacity` integer NOT NULL,
	`type` text DEFAULT 'CLASSROOM' NOT NULL,
	`building` text,
	`floor` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `time_slots` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`type` text DEFAULT 'CLASS' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timetable_change_log` (
	`id` text PRIMARY KEY NOT NULL,
	`timetable_id` text NOT NULL,
	`user_id` text NOT NULL,
	`field` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`reason` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`timetable_id`) REFERENCES `timetables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timetable_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`timetable_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`faculty_id` text NOT NULL,
	`room_id` text NOT NULL,
	`date` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`class_type` text DEFAULT 'REGULAR' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`timetable_id`) REFERENCES `timetables`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`faculty_id`) REFERENCES `faculty`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `timetables` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`academic_session_id` text NOT NULL,
	`week_start_date` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`quality_score` real,
	`generation_meta` text,
	`published_at` text,
	`published_by` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`allow` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'VIEWER' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`last_login_at` text,
	`faculty_id` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `working_days` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`is_working` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_org_idx` ON `audit_logs` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `batch_avail_uq` ON `batch_availability` (`batch_id`,`day_of_week`);--> statement-breakpoint
CREATE UNIQUE INDEX `bsr_uq` ON `batch_subject_requirements` (`batch_id`,`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `batches_org_code_uq` ON `batches` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `courses_org_code_uq` ON `courses` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_org_emp_uq` ON `faculty` (`organization_id`,`employee_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `faculty_avail_uq` ON `faculty_availability` (`faculty_id`,`day_of_week`);--> statement-breakpoint
CREATE UNIQUE INDEX `fb_uq` ON `faculty_batches` (`faculty_id`,`batch_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fs_uq` ON `faculty_subjects` (`faculty_id`,`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `holiday_uq` ON `holidays` (`organization_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `institute_settings_organization_id_unique` ON `institute_settings` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_unique` ON `invitations` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_key_unique` ON `permissions` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `room_avail_uq` ON `room_availability` (`room_id`,`day_of_week`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_org_code_uq` ON `rooms` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_org_code_uq` ON `subjects` (`organization_id`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `tte_batch_slot_uq` ON `timetable_entries` (`timetable_id`,`batch_id`,`date`,`start_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `tte_faculty_slot_uq` ON `timetable_entries` (`timetable_id`,`faculty_id`,`date`,`start_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `tte_room_slot_uq` ON `timetable_entries` (`timetable_id`,`room_id`,`date`,`start_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_perm_uq` ON `user_permissions` (`user_id`,`permission_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_org_email_uq` ON `users` (`organization_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `working_day_uq` ON `working_days` (`organization_id`,`day_of_week`);