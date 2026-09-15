"use server";

import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { redirect } from "next/navigation";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  if (!user || !user.passwordHash) return { error: "Invalid email or password." };
  if (user.status !== "ACTIVE") return { error: "This account is not active. Contact your Owner/Admin." };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { error: "Invalid email or password." };

  await db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id));

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect("/dashboard");
}
