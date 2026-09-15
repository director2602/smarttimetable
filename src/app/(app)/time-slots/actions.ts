"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { timeSlots, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const slotSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  type: z.enum(["CLASS", "BREAK", "DOUBTS", "DAY", "DATE"]),
  sortOrder: z.coerce.number().int()
});

export async function createTimeSlot(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const parsed = slotSchema.parse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type"),
    sortOrder: formData.get("sortOrder")
  });
  await db.insert(timeSlots).values({ organizationId: user.organizationId, ...parsed });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_CREATED" });
  revalidatePath("/time-slots");
}

export async function editTimeSlot(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const id = formData.get("id") as string;
  const parsed = slotSchema.parse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type"),
    sortOrder: formData.get("sortOrder")
  });
  const existing = await db.query.timeSlots.findFirst({ where: eq(timeSlots.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Time slot not found");

  await db.update(timeSlots).set(parsed).where(and(eq(timeSlots.id, id), eq(timeSlots.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_EDITED", entityId: id });
  revalidatePath("/time-slots");
}

export async function deleteTimeSlot(id: string) {
  const user = await requirePermission("SETTINGS_EDIT");
  const existing = await db.query.timeSlots.findFirst({ where: eq(timeSlots.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Time slot not found");

  await db.delete(timeSlots).where(and(eq(timeSlots.id, id), eq(timeSlots.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_DELETED", entityId: id });
  revalidatePath("/time-slots");
}
