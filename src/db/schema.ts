import { pgTable, text, integer, real, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const timestamps = {
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`)
};

/* ---------------- ORGANIZATION ---------------- */

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logoUrl: text("logo_url"),
  ...timestamps
});

/* ---------------- USERS / ROLES / PERMISSIONS ---------------- */

export const roleEnum = ["OWNER", "ADMIN", "TIMETABLE_MANAGER", "FACULTY", "VIEWER"] as const;
export const userStatusEnum = ["INVITED", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;

export const users = pgTable("users", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  role: text("role", { enum: roleEnum }).notNull().default("VIEWER"),
  status: text("status", { enum: userStatusEnum }).notNull().default("ACTIVE"),
  lastLoginAt: text("last_login_at"),
  facultyId: text("faculty_id"),
  ...timestamps
}, (t) => ({
  orgEmailUq: uniqueIndex("users_org_email_uq").on(t.organizationId, t.email)
}));

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(),
  label: text("label").notNull()
});

export const userPermissions = pgTable("user_permissions", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  permissionKey: text("permission_key").notNull(),
  allow: boolean("allow").notNull().default(true)
}, (t) => ({
  uq: uniqueIndex("user_perm_uq").on(t.userId, t.permissionKey)
}));

export const invitations = pgTable("invitations", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull(),
  role: text("role", { enum: roleEnum }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  ...timestamps
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  ...timestamps
});

/* ---------------- ACADEMIC SESSION ---------------- */

export const academicSessions = pgTable("academic_sessions", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

/* ---------------- COURSES / BATCHES / SUBJECTS ---------------- */

export const courses = pgTable("courses", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  status: text("status", { enum: ["ACTIVE", "ARCHIVED"] }).notNull().default("ACTIVE"),
  ...timestamps
}, (t) => ({ orgCodeUq: uniqueIndex("courses_org_code_uq").on(t.organizationId, t.code) }));

export const batches = pgTable("batches", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  courseId: text("course_id").notNull().references(() => courses.id),
  academicSessionId: text("academic_session_id").notNull().references(() => academicSessions.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  studentCount: integer("student_count").notNull().default(0),
  maxClassesPerDay: integer("max_classes_per_day").notNull().default(6),
  maxConsecutiveClasses: integer("max_consecutive_classes").notNull().default(3),
  status: text("status", { enum: ["ACTIVE", "ARCHIVED"] }).notNull().default("ACTIVE"),
  shift: text("shift", { enum: ["NONE", "MORNING", "EVENING"] }).notNull().default("NONE"),
  ...timestamps
}, (t) => ({ orgCodeUq: uniqueIndex("batches_org_code_uq").on(t.organizationId, t.code) }));

export const subjects = pgTable("subjects", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  ...timestamps
}, (t) => ({ orgCodeUq: uniqueIndex("subjects_org_code_uq").on(t.organizationId, t.code) }));

export const batchSubjectRequirements = pgTable("batch_subject_requirements", {
  id: id(),
  batchId: text("batch_id").notNull().references(() => batches.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  classesPerWeek: integer("classes_per_week").notNull(),
  minGapDays: integer("min_gap_days").notNull().default(0),
  ...timestamps
}, (t) => ({ uq: uniqueIndex("bsr_uq").on(t.batchId, t.subjectId) }));

export const batchAvailability = pgTable("batch_availability", {
  id: id(),
  batchId: text("batch_id").notNull().references(() => batches.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun..6=Sat
  available: boolean("available").notNull().default(true),
  startTime: text("start_time"),
  endTime: text("end_time")
}, (t) => ({ uq: uniqueIndex("batch_avail_uq").on(t.batchId, t.dayOfWeek) }));

/* ---------------- FACULTY ---------------- */

export const faculty = pgTable("faculty", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  employeeId: text("employee_id").notNull(),
  email: text("email"),
  phone: text("phone"),
  maxClassesPerDay: integer("max_classes_per_day").notNull().default(6),
  maxClassesPerWeek: integer("max_classes_per_week").notNull().default(30),
  status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).notNull().default("ACTIVE"),
  ...timestamps
}, (t) => ({ orgEmpUq: uniqueIndex("faculty_org_emp_uq").on(t.organizationId, t.employeeId) }));

export const facultySubjects = pgTable("faculty_subjects", {
  id: id(),
  facultyId: text("faculty_id").notNull().references(() => faculty.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id)
}, (t) => ({ uq: uniqueIndex("fs_uq").on(t.facultyId, t.subjectId) }));

export const facultyBatches = pgTable("faculty_batches", {
  id: id(),
  facultyId: text("faculty_id").notNull().references(() => faculty.id),
  batchId: text("batch_id").notNull().references(() => batches.id)
}, (t) => ({ uq: uniqueIndex("fb_uq").on(t.facultyId, t.batchId) }));

export const facultyAvailability = pgTable("faculty_availability", {
  id: id(),
  facultyId: text("faculty_id").notNull().references(() => faculty.id),
  dayOfWeek: integer("day_of_week").notNull(),
  available: boolean("available").notNull().default(true),
  startTime: text("start_time"),
  endTime: text("end_time")
}, (t) => ({ uq: uniqueIndex("faculty_avail_uq").on(t.facultyId, t.dayOfWeek) }));

export const facultyBlockedSlots = pgTable("faculty_blocked_slots", {
  id: id(),
  facultyId: text("faculty_id").notNull().references(() => faculty.id),
  date: text("date"), // specific date block, nullable = recurring
  dayOfWeek: integer("day_of_week"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason")
});

/* ---------------- ROOMS ---------------- */

export const rooms = pgTable("rooms", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  capacity: integer("capacity").notNull(),
  type: text("type").notNull().default("CLASSROOM"),
  building: text("building"),
  floor: text("floor"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).notNull().default("ACTIVE"),
  ...timestamps
}, (t) => ({ orgCodeUq: uniqueIndex("rooms_org_code_uq").on(t.organizationId, t.code) }));

export const roomAvailability = pgTable("room_availability", {
  id: id(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  dayOfWeek: integer("day_of_week").notNull(),
  available: boolean("available").notNull().default(true),
  startTime: text("start_time"),
  endTime: text("end_time")
}, (t) => ({ uq: uniqueIndex("room_avail_uq").on(t.roomId, t.dayOfWeek) }));

export const roomBlockedSlots = pgTable("room_blocked_slots", {
  id: id(),
  roomId: text("room_id").notNull().references(() => rooms.id),
  date: text("date"),
  dayOfWeek: integer("day_of_week"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  reason: text("reason")
});

/* ---------------- TIME SLOTS / HOLIDAYS ---------------- */

export const timeSlots = pgTable("time_slots", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  type: text("type", { enum: ["CLASS", "BREAK", "DOUBTS", "DAY", "DATE"] }).notNull().default("CLASS"),
  dayOfWeek: integer("day_of_week"), // deprecated, unused — kept only so the migration is a clean ADD, not an ambiguous rename
  daysOfWeek: integer("days_of_week").array(), // null/empty = applies every working day; e.g. [1,3,5] = only Mon/Wed/Fri (0=Sun..6=Sat)
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps
});

export const holidays = pgTable("holidays", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  date: text("date").notNull(),
  name: text("name").notNull()
}, (t) => ({ uq: uniqueIndex("holiday_uq").on(t.organizationId, t.date) }));

export const workingDays = pgTable("working_days", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  dayOfWeek: integer("day_of_week").notNull(),
  isWorking: boolean("is_working").notNull().default(true)
}, (t) => ({ uq: uniqueIndex("working_day_uq").on(t.organizationId, t.dayOfWeek) }));

export const tests = pgTable("tests", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  date: text("date").notNull(),
  batchId: text("batch_id").notNull().references(() => batches.id),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  roomId: text("room_id").references(() => rooms.id),
  notes: text("notes"),
  ...timestamps
});

export const batchTimeSlots = pgTable("batch_time_slots", {
  id: id(),
  batchId: text("batch_id").notNull().references(() => batches.id),
  timeSlotId: text("time_slot_id").notNull().references(() => timeSlots.id)
}, (t) => ({ uq: uniqueIndex("batch_time_slot_uq").on(t.batchId, t.timeSlotId) }));

/* ---------------- TIMETABLE ---------------- */

export const timetableStatusEnum = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"] as const;

export const timetables = pgTable("timetables", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  academicSessionId: text("academic_session_id").notNull().references(() => academicSessions.id),
  weekStartDate: text("week_start_date").notNull(),
  status: text("status", { enum: timetableStatusEnum }).notNull().default("DRAFT"),
  version: integer("version").notNull().default(1),
  qualityScore: real("quality_score"),
  generationMeta: text("generation_meta"), // JSON blob: required/scheduled/conflicts/warnings
  publishedAt: text("published_at"),
  publishedBy: text("published_by"),
  ...timestamps
});

export const timetableEntries = pgTable("timetable_entries", {
  id: id(),
  timetableId: text("timetable_id").notNull().references(() => timetables.id),
  batchId: text("batch_id").notNull().references(() => batches.id),
  subjectId: text("subject_id").notNull().references(() => subjects.id),
  facultyId: text("faculty_id").notNull().references(() => faculty.id),
  roomId: text("room_id").notNull().references(() => rooms.id),
  date: text("date").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  classType: text("class_type").notNull().default("REGULAR"),
  notes: text("notes"),
  ...timestamps
}, (t) => ({
  batchSlotUq: uniqueIndex("tte_batch_slot_uq").on(t.timetableId, t.batchId, t.date, t.startTime),
  facultySlotUq: uniqueIndex("tte_faculty_slot_uq").on(t.timetableId, t.facultyId, t.date, t.startTime),
  roomSlotUq: uniqueIndex("tte_room_slot_uq").on(t.timetableId, t.roomId, t.date, t.startTime)
}));

export const timetableChangeLog = pgTable("timetable_change_log", {
  id: id(),
  timetableId: text("timetable_id").notNull().references(() => timetables.id),
  userId: text("user_id").notNull().references(() => users.id),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  ...timestamps
});

/* ---------------- AUDIT / NOTIFICATIONS / SETTINGS ---------------- */

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: text("metadata"),
  ...timestamps
}, (t) => ({ orgIdx: index("audit_org_idx").on(t.organizationId) }));

export const notifications = pgTable("notifications", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  ...timestamps
});

export const instituteSettings = pgTable("institute_settings", {
  id: id(),
  organizationId: text("organization_id").notNull().references(() => organizations.id).unique(),
  instituteName: text("institute_name").notNull(),
  logoUrl: text("logo_url"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  ...timestamps
});

/* ---------------- RELATIONS (for query convenience) ---------------- */

export const batchesRelations = relations(batches, ({ one, many }) => ({
  course: one(courses, { fields: [batches.courseId], references: [courses.id] }),
  requirements: many(batchSubjectRequirements)
}));

export const timetablesRelations = relations(timetables, ({ many }) => ({
  entries: many(timetableEntries)
}));
