"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { faculty, facultyAvailability, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function editFaculty(formData: FormData) {
  const user = await requirePermission("FACULTY_EDIT");
  const schema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    employeeId: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    maxClassesPerDay: z.coerce.number().int().min(1),
    maxClassesPerWeek: z.coerce.number().int().min(1),
    status: z.enum(["ACTIVE", "INACTIVE"])
  });
  const parsed = schema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    employeeId: formData.get("employeeId"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    maxClassesPerDay: formData.get("maxClassesPerDay"),
    maxClassesPerWeek: formData.get("maxClassesPerWeek"),
    status: formData.get("status")
  });

  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, parsed.id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Faculty not found");

  await db.update(faculty).set({
    name: parsed.name,
    employeeId: parsed.employeeId,
    email: parsed.email || null,
    phone: parsed.phone || null,
    maxClassesPerDay: parsed.maxClassesPerDay,
    maxClassesPerWeek: parsed.maxClassesPerWeek,
    status: parsed.status,
    updatedAt: new Date().toISOString()
  }).where(and(eq(faculty.id, parsed.id), eq(faculty.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "FACULTY_EDITED", entityType: "faculty", entityId: parsed.id });
  revalidatePath("/faculty");
}

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
