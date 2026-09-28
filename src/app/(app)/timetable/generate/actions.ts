"use server";

import { requirePermission } from "@/lib/auth";
import { buildSchedulerInput } from "@/scheduler/build-input";
import { generateMultipleAttempts } from "@/scheduler/generator";
import { db } from "@/db";
import { timetables, timetableEntries, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { advanceChapterProgressForEntries } from "@/lib/chapter-progress";

export async function generateTimetableAction(input: {
  academicSessionId: string;
  weekStartDate: string;
  courseId?: string;
  batchId?: string;
}) {
  const user = await requirePermission("TIMETABLE_GENERATE");

  const schedulerInput = await buildSchedulerInput({
    organizationId: user.organizationId,
    academicSessionId: input.academicSessionId,
    weekStartDate: input.weekStartDate,
    courseId: input.courseId,
    batchId: input.batchId
  });

  const attempts = generateMultipleAttempts(schedulerInput, 3);

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "TIMETABLE_GENERATE_ATTEMPT",
    entityType: "timetable",
    metadata: JSON.stringify({ weekStartDate: input.weekStartDate, scores: attempts.map((a) => a.qualityScore) })
  });

  return attempts.map((a) => ({
    qualityScore: a.qualityScore,
    requiredTotal: a.requiredTotal,
    scheduledTotal: a.scheduledTotal,
    unscheduled: a.unscheduled,
    warnings: a.warnings,
    entries: a.entries,
    progressUpdates: Array.from(a.progressUpdates.entries()) // Map isn't serializable across the server action boundary
  }));
}

export async function saveGeneratedTimetableAction(input: {
  academicSessionId: string;
  weekStartDate: string;
  qualityScore: number;
  requiredTotal: number;
  scheduledTotal: number;
  unscheduled: unknown;
  entries: {
    batchId: string; subjectId: string | null; facultyId: string | null; lectureId: string | null; roomId: string;
    date: string; dayOfWeek: number; startTime: string; endTime: string; classType: "REGULAR" | "DOUBTS";
  }[];
  warnings?: string[];
}) {
  const user = await requirePermission("TIMETABLE_CREATE");

  const [tt] = await db.insert(timetables).values({
    organizationId: user.organizationId,
    academicSessionId: input.academicSessionId,
    weekStartDate: input.weekStartDate,
    status: "DRAFT",
    qualityScore: input.qualityScore,
    generationMeta: JSON.stringify({
      requiredTotal: input.requiredTotal,
      scheduledTotal: input.scheduledTotal,
      unscheduled: input.unscheduled,
      warnings: input.warnings || []
    })
  }).returning();

  if (input.entries.length > 0) {
    await db.insert(timetableEntries).values(
      input.entries.map((e) => ({ timetableId: tt.id, ...e }))
    );
  }

  // NOTE: chapter progress is intentionally NOT advanced here. A draft can be
  // generated and saved multiple times while comparing quality scores, and it
  // may never be published. Progress only advances when the timetable is
  // actually published — see publishTimetableAction below.

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "TIMETABLE_CREATED",
    entityType: "timetable",
    entityId: tt.id
  });

  revalidatePath("/timetable");
  return { timetableId: tt.id };
}

export async function publishTimetableAction(timetableId: string) {
  const user = await requirePermission("TIMETABLE_PUBLISH");

  const entries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.timetableId, timetableId) });
  // Re-validate structurally (batch/faculty/room double-booking) directly from saved entries.
  // Null faculty (DOUBTS periods) is never a real conflict, so it's excluded from that check.
  const seen = new Map<string, string>();
  for (const e of entries) {
    const keys = [`B:${e.batchId}:${e.date}:${e.startTime}`, `R:${e.roomId}:${e.date}:${e.startTime}`];
    if (e.facultyId) keys.push(`F:${e.facultyId}:${e.date}:${e.startTime}`);
    for (const key of keys) {
      if (seen.has(key)) {
        return { error: "Cannot publish: hard conflicts detected in the current timetable. Resolve them in the Conflicts dashboard first." };
      }
      seen.set(key, e.id);
    }
  }

  await db.update(timetables).set({
    status: "PUBLISHED",
    publishedAt: new Date().toISOString(),
    publishedBy: user.id
  }).where(eq(timetables.id, timetableId));

  // Chapter progress advances only now, at publish time — not on every draft save.
  await advanceChapterProgressForEntries(entries);

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "TIMETABLE_PUBLISHED",
    entityType: "timetable",
    entityId: timetableId
  });

  revalidatePath("/timetable");
  return { success: true };
}
