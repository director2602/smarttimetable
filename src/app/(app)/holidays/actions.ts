"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { holidays, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createHoliday(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const { date, name } = z.object({ date: z.string(), name: z.string().min(1) }).parse({
    date: formData.get("date"), name: formData.get("name")
  });
  await db.insert(holidays).values({ organizationId: user.organizationId, date, name });
  revalidatePath("/holidays");
}

export async function editHoliday(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const id = formData.get("id") as string;
  const { date, name } = z.object({ date: z.string(), name: z.string().min(1) }).parse({
    date: formData.get("date"), name: formData.get("name")
  });

  const existing = await db.query.holidays.findFirst({ where: eq(holidays.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Holiday not found");

  await db.update(holidays).set({ date, name }).where(and(eq(holidays.id, id), eq(holidays.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "HOLIDAY_EDITED", entityId: id });
  revalidatePath("/holidays");
}

export async function deleteHoliday(id: string) {
  const user = await requirePermission("SETTINGS_EDIT");
  const existing = await db.query.holidays.findFirst({ where: eq(holidays.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Holiday not found");

  await db.delete(holidays).where(and(eq(holidays.id, id), eq(holidays.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "HOLIDAY_DELETED", entityId: id });
  revalidatePath("/holidays");
}
