"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { roleEnum } from "@/db/schema";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(roleEnum),
  password: z.string().min(8)
});

export async function createUser(formData: FormData) {
  const user = await requirePermission("USER_CREATE");
  const parsed = schema.parse({
    name: formData.get("name"), email: formData.get("email"), role: formData.get("role"), password: formData.get("password")
  });
  const passwordHash = await hashPassword(parsed.password);
  await db.insert(users).values({
    organizationId: user.organizationId, name: parsed.name, email: parsed.email, role: parsed.role,
    passwordHash, status: "ACTIVE"
  });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "USER_CREATED" });
  revalidatePath("/admin/users");
}

export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED") {
  const admin = await requirePermission("USER_DEACTIVATE");
  const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (target?.role === "OWNER") throw new Error("Cannot deactivate the Owner account.");
  await db.update(users).set({ status }).where(and(eq(users.id, userId), eq(users.organizationId, admin.organizationId)));
  await db.insert(auditLogs).values({ organizationId: admin.organizationId, userId: admin.id, action: `USER_${status}`, entityId: userId });
  revalidatePath("/admin/users");
}
