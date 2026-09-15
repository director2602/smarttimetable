"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { subjects, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Subject not found");

  await db.update(subjects).set({ name, code, updatedAt: new Date().toISOString() })
    .where(and(eq(subjects.id, id), eq(subjects.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "SUBJECT_EDITED", entityType: "subject", entityId: id });
  revalidatePath("/subjects");
}
