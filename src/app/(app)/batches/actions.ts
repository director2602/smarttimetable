"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { batches, auditLogs, batchAvailability, batchSubjectRequirements, subjects, facultyBatches, timetableEntries } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function setBatchRequirement(formData: FormData) {
  const user = await requirePermission("BATCH_EDIT");
  const batchId = formData.get("batchId") as string;
  const subjectId = formData.get("subjectId") as string;
  const classesPerWeek = Number(formData.get("classesPerWeek"));

  const batch = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!batch || batch.organizationId !== user.organizationId) throw new Error("Batch not found");
  if (!subjectId) throw new Error("Select a subject");
  if (!classesPerWeek || classesPerWeek < 1) throw new Error("Classes per week must be at least 1");

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

export async function updateBatchAvailability(batchId: string, days: { dayOfWeek: number; available: boolean }[]) {
  const user = await requirePermission("BATCH_EDIT");

  const existing = await db.query.batches.findFirst({ where: eq(batches.id, batchId) });
  if (!existing || existing.organizationId !== user.organizationId) {
    throw new Error("Batch not found");
  }

  for (const d of days) {
    const row = await db.query.batchAvailability.findFirst({
      where: and(eq(batchAvailability.batchId, batchId), eq(batchAvailability.dayOfWeek, d.dayOfWeek))
    });
    if (row) {
      await db.update(batchAvailability).set({ available: d.available }).where(eq(batchAvailability.id, row.id));
    } else {
      await db.insert(batchAvailability).values({
        batchId,
        dayOfWeek: d.dayOfWeek,
        available: d.available,
        startTime: d.available ? "07:00" : null,
        endTime: d.available ? "17:00" : null
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
}

export async function deleteBatch(id: string) {
  const user = await requirePermission("BATCH_DELETE");
  const existing = await db.query.batches.findFirst({ where: eq(batches.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Batch not found");

  const usedEntries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.batchId, id) });
  if (usedEntries.length > 0) {
    throw new Error(`Cannot delete — ${existing.name} appears in ${usedEntries.length} scheduled class(es) across one or more timetables. Archive it instead, or remove those classes first.`);
  }

  await db.delete(batchSubjectRequirements).where(eq(batchSubjectRequirements.batchId, id));
  await db.delete(batchAvailability).where(eq(batchAvailability.batchId, id));
  await db.delete(facultyBatches).where(eq(facultyBatches.batchId, id));
  await db.delete(batches).where(and(eq(batches.id, id), eq(batches.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "BATCH_DELETED", entityType: "batch", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/batches");
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
