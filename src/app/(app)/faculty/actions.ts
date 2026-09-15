"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { faculty, facultyAvailability, auditLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateFacultyAvailability(facultyId: string, days: { dayOfWeek: number; available: boolean }[]) {
  const user = await requirePermission("FACULTY_EDIT");

  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, facultyId) });
  if (!existing || existing.organizationId !== user.organizationId) {
    throw new Error("Faculty not found");
  }

  for (const d of days) {
    const row = await db.query.facultyAvailability.findFirst({
      where: and(eq(facultyAvailability.facultyId, facultyId), eq(facultyAvailability.dayOfWeek, d.dayOfWeek))
    });
    if (row) {
      await db.update(facultyAvailability).set({ available: d.available }).where(eq(facultyAvailability.id, row.id));
    } else {
      await db.insert(facultyAvailability).values({
        facultyId,
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
    action: "FACULTY_ROSTER_UPDATED",
    entityType: "faculty",
    entityId: facultyId,
    metadata: JSON.stringify({ days })
  });

  revalidatePath("/faculty");
}
