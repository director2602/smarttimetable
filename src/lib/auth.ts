import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users, userPermissions, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { resolvePermission, type Permission, type Role } from "./permissions";

const SESSION_COOKIE = "stt_session";
const secretKey = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
const key = new TextEncoder().encode(secretKey);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const userId = payload.userId as string;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user || user.status !== "ACTIVE") return null;
    const org = await db.query.organizations.findFirst({ where: eq(organizations.id, user.organizationId) });
    return { ...user, organization: org };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  const overrides = await db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) });
  const allowed = resolvePermission(user.role as Role, overrides, permission);
  if (!allowed) throw new Error(`FORBIDDEN: missing ${permission}`);
  return user;
}
