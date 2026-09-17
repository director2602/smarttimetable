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
  dayOfWeek: z.string().optional().or(z.literal("")),
  sortOrder: z.coerce.number().int()
});

function parseDayOfWeek(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 6 ? n : null;
}

export async function createTimeSlot(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const parsed = slotSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type"),
    dayOfWeek: formData.get("dayOfWeek"),
    sortOrder: formData.get("sortOrder")
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message || "Invalid input" };

  await db.insert(timeSlots).values({
    organizationId: user.organizationId,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    type: parsed.data.type,
    dayOfWeek: parseDayOfWeek(parsed.data.dayOfWeek),
    sortOrder: parsed.data.sortOrder
  });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_CREATED" });
  revalidatePath("/time-slots");
  return { success: true };
}

export async function editTimeSlot(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const id = formData.get("id") as string;
  const parsed = slotSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    type: formData.get("type"),
    dayOfWeek: formData.get("dayOfWeek"),
    sortOrder: formData.get("sortOrder")
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message || "Invalid input" };

  const existing = await db.query.timeSlots.findFirst({ where: eq(timeSlots.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Time slot not found" };

  await db.update(timeSlots).set({
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    type: parsed.data.type,
    dayOfWeek: parseDayOfWeek(parsed.data.dayOfWeek),
    sortOrder: parsed.data.sortOrder
  }).where(and(eq(timeSlots.id, id), eq(timeSlots.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_EDITED", entityId: id });
  revalidatePath("/time-slots");
  return { success: true };
}

export async function deleteTimeSlot(id: string) {
  const user = await requirePermission("SETTINGS_EDIT");
  const existing = await db.query.timeSlots.findFirst({ where: eq(timeSlots.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Time slot not found" };

  await db.delete(timeSlots).where(and(eq(timeSlots.id, id), eq(timeSlots.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIME_SLOT_DELETED", entityId: id });
  revalidatePath("/time-slots");
  return { success: true };
}
