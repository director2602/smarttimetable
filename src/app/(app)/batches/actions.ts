"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { batches, auditLogs, batchAvailability, batchSubjectRequirements, batchTimeSlots, subjects, facultyBatches, timetableEntries } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateBatchTimeSlots(batchId: string, timeSlotIds: string[]) {
  const user = await requirePermission("BATCH_EDIT");
  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) throw new Error("Batch not found");

  await db.delete(batchTimeSlots).where(eq(batchTimeSlots.batchId, batchId));
  if (timeSlotIds.length > 0) {
    await db.insert(batchTimeSlots).values(timeSlotIds.map((timeSlotId) => ({ batchId, timeSlotId })));
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "BATCH_TIME_SLOTS_UPDATED",
    entityType: "batch", entityId: batchId, metadata: JSON.stringify({ timeSlotIds })
  });
  revalidatePath("/batches");
}

export async function setBatchRequirement(formData: FormData) {
  const user = await requirePermission("BATCH_EDIT");
  const batchId = formData.get("batchId") as string;
  const subjectId = formData.get("subjectId") as string;
  const classesPerWeek = Number(formData.get("classesPerWeek"));

  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) return { error: "Batch not found" };
  if (!subjectId) return { error: "Select a subject" };
  if (!classesPerWeek || classesPerWeek < 1) return { error: "Classes per week must be at least 1" };

  const existing = await db.query.batchSubjectRequirements.findFirst({
    where: and(eq(batchSubjectRequirements.batchId, batchId), eq(batchSubjectRequirements.subjectId, subjectId))
  });
  if (existing) {
    await db.update(batchSubjectRequirements).set({ classesPerWeek }).where(eq(batchSubjectRequirements.id, existing.id));
  } else {
    await db.insert(batchSubjectRequirements).values({ batchId, subjectId, classesPerWeek, minGapDays: 0 });
  }

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "BATCH_REQUIREMENT_SET", entityType: "batch", entityId: batchId });
  revalidatePath("/batches");
  return { success: true };
}

export async function removeBatchRequirement(batchId: string, subjectId: string) {
  const user = await requirePermission("BATCH_EDIT");
  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) throw new Error("Batch not found");

  await db.delete(batchSubjectRequirements).where(and(eq(batchSubjectRequirements.batchId, batchId), eq(batchSubjectRequirements.subjectId, subjectId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "BATCH_REQUIREMENT_REMOVED", entityType: "batch", entityId: batchId });
  revalidatePath("/batches");
}

const editSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  studentCount: z.coerce.number().int().min(0),
  maxClassesPerDay: z.coerce.number().int().min(1),
  maxConsecutiveClasses: z.coerce.number().int().min(1)
});

const SHIFT_TIMES: Record<"MORNING" | "EVENING", { startTime: string; endTime: string }> = {
  MORNING: { startTime: "08:00", endTime: "14:30" },
  EVENING: { startTime: "15:00", endTime: "20:00" }
};

export async function updateBatchDayShifts(
  batchId: string,
  days: { dayOfWeek: number; available: boolean; shift: "NONE" | "MORNING" | "EVENING" }[]
) {
  const user = await requirePermission("BATCH_EDIT");
  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) return { error: "Batch not found" };

  for (const d of days) {
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (d.available) {
      if (d.shift !== "NONE") {
        startTime = SHIFT_TIMES[d.shift].startTime;
        endTime = SHIFT_TIMES[d.shift].endTime;
      } else {
        startTime = "07:00";
        endTime = "17:00";
      }
    }

    const existing = await db.query.batchAvailability.findFirst({
      where: and(eq(batchAvailability.batchId, batchId), eq(batchAvailability.dayOfWeek, d.dayOfWeek))
    });
    if (existing) {
      await db.update(batchAvailability).set({ available: d.available, shift: d.shift, startTime, endTime }).where(eq(batchAvailability.id, existing.id));
    } else {
      await db.insert(batchAvailability).values({ batchId, dayOfWeek: d.dayOfWeek, available: d.available, shift: d.shift, startTime, endTime });
    }
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "BATCH_DAY_SHIFTS_UPDATED",
    entityType: "batch", entityId: batchId, metadata: JSON.stringify({ days })
  });
  revalidatePath("/batches");
  return { success: true };
}

export async function setBatchShift(batchId: string, shift: "NONE" | "MORNING" | "EVENING") {
  const user = await requirePermission("BATCH_EDIT");
  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) return { error: "Batch not found" };

  await db.update(batches).set({ shift, updatedAt: new Date().toISOString() })
    .where(and(eq(batches.id, batchId), eq(batches.organizationId, user.organizationId)));

  if (shift !== "NONE") {
    const times = SHIFT_TIMES[shift];
    const existingRows = await db.query.batchAvailability.findMany({ where: eq(batchAvailability.batchId, batchId) });

    if (existingRows.length === 0) {
      // No roster configured yet — default to Mon-Sat working, Sunday off, at this shift's hours
      for (let d = 0; d <= 6; d++) {
        const available = d !== 0;
        await db.insert(batchAvailability).values({
          batchId, dayOfWeek: d, available,
          startTime: available ? times.startTime : null, endTime: available ? times.endTime : null
        });
      }
    } else {
      for (const row of existingRows) {
        if (!row.available) continue; // leave week-off days alone
        await db.update(batchAvailability).set({ startTime: times.startTime, endTime: times.endTime }).where(eq(batchAvailability.id, row.id));
      }
    }
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "BATCH_SHIFT_SET",
    entityType: "batch", entityId: batchId, metadata: JSON.stringify({ shift })
  });
  revalidatePath("/batches");
  return { success: true };
}

export async function updateBatchAvailability(batchId: string, days: { dayOfWeek: number; available: boolean }[]) {
  const user = await requirePermission("BATCH_EDIT");

  const existing = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!existing || existing.organizationId !== user.organizationId) {
    return { error: "Batch not found" };
  }

  const times = existing.shift !== "NONE" ? SHIFT_TIMES[existing.shift as "MORNING" | "EVENING"] : { startTime: "07:00", endTime: "17:00" };

  for (const d of days) {
    const row = await db.query.batchAvailability.findFirst({
      where: and(eq(batchAvailability.batchId, batchId), eq(batchAvailability.dayOfWeek, d.dayOfWeek))
    });
    if (row) {
      await db.update(batchAvailability).set({
        available: d.available,
        startTime: d.available ? (row.startTime || times.startTime) : null,
        endTime: d.available ? (row.endTime || times.endTime) : null
      }).where(eq(batchAvailability.id, row.id));
    } else {
      await db.insert(batchAvailability).values({
        batchId,
        dayOfWeek: d.dayOfWeek,
        available: d.available,
        startTime: d.available ? times.startTime : null,
        endTime: d.available ? times.endTime : null
      });
    }
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "BATCH_ROSTER_UPDATED",
    entityType: "batch",
    entityId: batchId,
    metadata: JSON.stringify({ days })
  });

  revalidatePath("/batches");
  return { success: true };
}

export async function deleteBatch(id: string) {
  const user = await requirePermission("BATCH_DELETE");
  const existing = await db.query.batches.findFirst({ where: eq(batches.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Batch not found" };

  const usedEntries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.batchId, id) });
  if (usedEntries.length > 0) {
    return { error: `Cannot delete — ${existing.name} appears in ${usedEntries.length} scheduled class(es) across one or more timetables. Archive it instead, or remove those classes first.` };
  }

  await db.delete(batchSubjectRequirements).where(eq(batchSubjectRequirements.batchId, id));
  await db.delete(batchAvailability).where(eq(batchAvailability.batchId, id));
  await db.delete(facultyBatches).where(eq(facultyBatches.batchId, id));
  await db.delete(batches).where(and(eq(batches.id, id), eq(batches.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "BATCH_DELETED", entityType: "batch", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/batches");
  return { success: true };
}

export async function editBatch(formData: FormData) {
  const user = await requirePermission("BATCH_EDIT");
  const parsed = editSchema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    code: formData.get("code"),
    studentCount: formData.get("studentCount"),
    maxClassesPerDay: formData.get("maxClassesPerDay"),
    maxConsecutiveClasses: formData.get("maxConsecutiveClasses")
  });

  const existing = await db.query.batches.findFirst({ where: eq(batches.id, parsed.id) });
  if (!existing || existing.organizationId !== user.organizationId) {
    throw new Error("Batch not found");
  }

  await db.update(batches).set({
    name: parsed.name,
    code: parsed.code,
    studentCount: parsed.studentCount,
    maxClassesPerDay: parsed.maxClassesPerDay,
    maxConsecutiveClasses: parsed.maxConsecutiveClasses,
    updatedAt: new Date().toISOString()
  }).where(and(eq(batches.id, parsed.id), eq(batches.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "BATCH_EDITED",
    entityType: "batch",
    entityId: parsed.id,
    metadata: JSON.stringify({
      before: { name: existing.name, code: existing.code },
      after: { name: parsed.name, code: parsed.code }
    })
  });

  revalidatePath("/batches");
}
