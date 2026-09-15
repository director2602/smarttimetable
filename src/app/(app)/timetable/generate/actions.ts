"use server";

import { requirePermission } from "@/lib/auth";
import { buildSchedulerInput } from "@/scheduler/build-input";
import { generateMultipleAttempts } from "@/scheduler/generator";
import { hasHardConflicts, validateSchedule } from "@/scheduler/validator";
import { db } from "@/db";
import { timetables, timetableEntries, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
    entries: a.entries
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
    batchId: string; subjectId: string; facultyId: string; roomId: string;
    date: string; dayOfWeek: number; startTime: string; endTime: string;
  }[];
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
      unscheduled: input.unscheduled
    })
  }).returning();

  if (input.entries.length > 0) {
    await db.insert(timetableEntries).values(
      input.entries.map((e) => ({ timetableId: tt.id, classType: "REGULAR", ...e }))
    );
  }

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
  // Re-validate structurally (batch/faculty/room double-booking) directly from saved entries
  const seen = new Map<string, string>();
  for (const e of entries) {
    for (const key of [`B:${e.batchId}:${e.date}:${e.startTime}`, `F:${e.facultyId}:${e.date}:${e.startTime}`, `R:${e.roomId}:${e.date}:${e.startTime}`]) {
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
