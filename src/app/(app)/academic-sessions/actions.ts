"use server";

import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { academicSessions, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const schema = z.object({ name: z.string().min(1), startDate: z.string(), endDate: z.string() });

export async function createAcademicSession(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const parsed = schema.parse({ name: formData.get("name"), startDate: formData.get("startDate"), endDate: formData.get("endDate") });
  await db.insert(academicSessions).values({ organizationId: user.organizationId, ...parsed, active: true });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ACADEMIC_SESSION_CREATED" });
  revalidatePath("/academic-sessions");
}

export async function editAcademicSession(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const id = formData.get("id") as string;
  const parsed = schema.parse({ name: formData.get("name"), startDate: formData.get("startDate"), endDate: formData.get("endDate") });
  const active = formData.get("active") === "on";

  const existing = await db.query.academicSessions.findFirst({ where: eq(academicSessions.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Academic session not found");

  await db.update(academicSessions).set({ ...parsed, active, updatedAt: new Date().toISOString() })
    .where(and(eq(academicSessions.id, id), eq(academicSessions.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ACADEMIC_SESSION_EDITED", entityId: id });
  revalidatePath("/academic-sessions");
}
