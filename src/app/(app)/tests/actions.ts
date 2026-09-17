"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { tests, batches, timetables, timetableEntries, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const testSchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  batchId: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  roomId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal(""))
});

async function checkClassConflict(orgId: string, batchId: string, date: string, startTime: string, endTime: string) {
  const orgTimetables = await db.query.timetables.findMany({ where: eq(timetables.organizationId, orgId) });
  const ids = orgTimetables.map((t) => t.id);
  if (ids.length === 0) return null;
  const entries = await db.query.timetableEntries.findMany({ where: and(eq(timetableEntries.batchId, batchId), eq(timetableEntries.date, date)) });
  const overlap = entries.find((e) => e.startTime < endTime && startTime < e.endTime && ids.includes(e.timetableId));
  return overlap ? `Heads up: this batch already has a class scheduled ${overlap.startTime}-${overlap.endTime} on ${date} that overlaps this test time.` : null;
}

export async function createTest(formData: FormData) {
  const user = await requirePermission("TIMETABLE_CREATE");
  const parsed = testSchema.safeParse({
    name: formData.get("name"), date: formData.get("date"), batchId: formData.get("batchId"),
    startTime: formData.get("startTime"), endTime: formData.get("endTime"),
    roomId: formData.get("roomId"), notes: formData.get("notes")
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message || "Invalid input" };

  const batch = await db.query.batches.findFirst({ where: eq(batches.id, parsed.data.batchId) });
  if (!batch || batch.organizationId !== user.organizationId) return { error: "Batch not found" };

  const warning = await checkClassConflict(user.organizationId, parsed.data.batchId, parsed.data.date, parsed.data.startTime, parsed.data.endTime);

  await db.insert(tests).values({
    organizationId: user.organizationId,
    name: parsed.data.name,
    date: parsed.data.date,
    batchId: parsed.data.batchId,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    roomId: parsed.data.roomId || null,
    notes: parsed.data.notes || null
  });

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TEST_CREATED", metadata: JSON.stringify({ name: parsed.data.name, date: parsed.data.date }) });
  revalidatePath("/tests");
  return { success: true, warning };
}

export async function deleteTest(id: string) {
  const user = await requirePermission("TIMETABLE_DELETE");
  const existing = await db.query.tests.findFirst({ where: eq(tests.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Test not found" };

  await db.delete(tests).where(and(eq(tests.id, id), eq(tests.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TEST_DELETED", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/tests");
  return { success: true };
}
