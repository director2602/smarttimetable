"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { subjects, auditLogs, batchSubjectRequirements, facultySubjects, timetableEntries, lectures } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteSubject(id: string) {
  const user = await requirePermission("SUBJECT_DELETE");
  const existing = await db.query.subjects.findFirst({ where: eq(subjects.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Subject not found" };

  const [usedInEntries, usedInRequirements] = await Promise.all([
    db.query.timetableEntries.findMany({ where: eq(timetableEntries.subjectId, id) }),
    db.query.batchSubjectRequirements.findMany({ where: eq(batchSubjectRequirements.subjectId, id) })
  ]);
  if (usedInEntries.length > 0) {
    return { error: `Cannot delete — ${existing.name} appears in ${usedInEntries.length} scheduled class(es). Remove those classes first.` };
  }
  if (usedInRequirements.length > 0) {
    return { error: `Cannot delete — ${existing.name} is required by ${usedInRequirements.length} batch(es). Remove those requirements first.` };
  }

  await db.delete(facultySubjects).where(eq(facultySubjects.subjectId, id));
  await db.delete(lectures).where(eq(lectures.subjectId, id));
  await db.delete(subjects).where(and(eq(subjects.id, id), eq(subjects.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "SUBJECT_DELETED", entityType: "subject", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/subjects");
  return { success: true };
}

export async function createSubject(formData: FormData) {
  const user = await requirePermission("SUBJECT_CREATE");
  const { name, code } = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse({
    name: formData.get("name"), code: formData.get("code")
  });
  await db.insert(subjects).values({ organizationId: user.organizationId, name, code });
  revalidatePath("/subjects");
}

export async function editSubject(formData: FormData) {
  const user = await requirePermission("SUBJECT_EDIT");
  const id = formData.get("id") as string;
  const { name, code } = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse({
    name: formData.get("name"), code: formData.get("code")
  });

  const existing = await db.query.subjects.findFirst({ where: eq(subjects.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Subject not found" };

  await db.update(subjects).set({ name, code, updatedAt: new Date().toISOString() })
    .where(and(eq(subjects.id, id), eq(subjects.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "SUBJECT_EDITED", entityType: "subject", entityId: id });
  revalidatePath("/subjects");
  return { success: true };
}

export async function createLecture(formData: FormData) {
  const user = await requirePermission("SUBJECT_EDIT");
  const subjectId = formData.get("subjectId") as string;
  const { code, name } = z.object({ code: z.string().min(1), name: z.string().min(1) }).parse({
    code: formData.get("code"), name: formData.get("name")
  });

  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });
  if (!subject || subject.organizationId !== user.organizationId) return { error: "Subject not found" };

  const existingLectures = await db.query.lectures.findMany({ where: eq(lectures.subjectId, subjectId) });
  const nextSortOrder = existingLectures.length ? Math.max(...existingLectures.map((l) => l.sortOrder)) + 1 : 1;

  await db.insert(lectures).values({ organizationId: user.organizationId, subjectId, code, name, sortOrder: nextSortOrder });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "LECTURE_CREATED", entityType: "subject", entityId: subjectId });
  revalidatePath("/subjects");
  return { success: true };
}

export async function deleteLecture(id: string) {
  const user = await requirePermission("SUBJECT_EDIT");
  const existing = await db.query.lectures.findFirst({ where: eq(lectures.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Chapter not found" };

  const usedInEntries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.lectureId, id) });
  if (usedInEntries.length > 0) {
    return { error: `Cannot delete — this chapter appears in ${usedInEntries.length} scheduled class(es). Remove those classes first.` };
  }

  await db.delete(lectures).where(and(eq(lectures.id, id), eq(lectures.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "LECTURE_DELETED", entityId: id });
  revalidatePath("/subjects");
  return { success: true };
}
