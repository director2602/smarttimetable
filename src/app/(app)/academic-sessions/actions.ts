"use server";

import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { academicSessions, auditLogs } from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({ name: z.string().min(1), startDate: z.string(), endDate: z.string() });

export async function createAcademicSession(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const parsed = schema.parse({ name: formData.get("name"), startDate: formData.get("startDate"), endDate: formData.get("endDate") });
  await db.insert(academicSessions).values({ organizationId: user.organizationId, ...parsed, active: true });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ACADEMIC_SESSION_CREATED" });
  revalidatePath("/academic-sessions");
}
