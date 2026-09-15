"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function createSubject(formData: FormData) {
  const user = await requirePermission("SUBJECT_CREATE");
  const { name, code } = z.object({ name: z.string().min(1), code: z.string().min(1) }).parse({
    name: formData.get("name"), code: formData.get("code")
  });
  await db.insert(subjects).values({ organizationId: user.organizationId, name, code });
  revalidatePath("/subjects");
}
