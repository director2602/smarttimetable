"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function createHoliday(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const { date, name } = z.object({ date: z.string(), name: z.string().min(1) }).parse({
    date: formData.get("date"), name: formData.get("name")
  });
  await db.insert(holidays).values({ organizationId: user.organizationId, date, name });
  revalidatePath("/holidays");
}
