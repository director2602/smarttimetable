"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { courses, auditLogs, batches } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteCourse(id: string) {
  const user = await requirePermission("COURSE_DELETE");
  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Course not found" };

  const dependentBatches = await db.query.batches.findMany({ where: eq(batches.courseId, id) });
  if (dependentBatches.length > 0) {
    return { error: `Cannot delete — ${dependentBatches.length} batch(es) belong to this course (${dependentBatches.map((b) => b.name).join(", ")}). Delete or reassign them first.` };
  }

  await db.delete(courses).where(and(eq(courses.id, id), eq(courses.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "COURSE_DELETED", entityType: "course", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/courses");
  return { success: true };
}

export async function createCourse(formData: FormData) {
  const user = await requirePermission("COURSE_CREATE");
  const { name, code } = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse({
    name: formData.get("name"), code: formData.get("code")
  });
  await db.insert(courses).values({ organizationId: user.organizationId, name, code });
  revalidatePath("/courses");
}

export async function editCourse(formData: FormData) {
  const user = await requirePermission("COURSE_EDIT");
  const id = formData.get("id") as string;
  const { name, code, status } = z.object({
    name: z.string().min(1), code: z.string().min(1), status: z.enum(["ACTIVE", "ARCHIVED"])
  }).parse({ name: formData.get("name"), code: formData.get("code"), status: formData.get("status") });

  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Course not found");

  await db.update(courses).set({ name, code, status, updatedAt: new Date().toISOString() })
    .where(and(eq(courses.id, id), eq(courses.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "COURSE_EDITED", entityType: "course", entityId: id });
  revalidatePath("/courses");
}
