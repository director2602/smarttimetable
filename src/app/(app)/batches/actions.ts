"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { batches, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const editSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  studentCount: z.coerce.number().int().min(0),
  maxClassesPerDay: z.coerce.number().int().min(1),
  maxConsecutiveClasses: z.coerce.number().int().min(1)
});

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
