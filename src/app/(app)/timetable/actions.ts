"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, timetableChangeLog, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteTimetable(id: string) {
  const user = await requirePermission("TIMETABLE_DELETE");
  const existing = await db.query.timetables.findFirst({ where: eq(timetables.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Timetable not found" };

  await db.delete(timetableChangeLog).where(eq(timetableChangeLog.timetableId, id));
  await db.delete(timetableEntries).where(eq(timetableEntries.timetableId, id));
  await db.delete(timetables).where(and(eq(timetables.id, id), eq(timetables.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "TIMETABLE_DELETED",
    entityType: "timetable", entityId: id, metadata: JSON.stringify({ weekStartDate: existing.weekStartDate, status: existing.status })
  });

  revalidatePath("/timetable");
  revalidatePath("/batches");
  revalidatePath("/courses");
  return { success: true };
}
