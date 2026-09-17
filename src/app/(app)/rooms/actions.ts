"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { rooms, auditLogs, roomAvailability, roomBlockedSlots, timetableEntries } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteRoom(id: string) {
  const user = await requirePermission("ROOM_DELETE");
  const existing = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Room not found" };

  const usedEntries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.roomId, id) });
  if (usedEntries.length > 0) {
    return { error: `Cannot delete — ${existing.name} appears in ${usedEntries.length} scheduled class(es) across one or more timetables. Set it to Inactive instead, or remove those classes first.` };
  }

  await db.delete(roomAvailability).where(eq(roomAvailability.roomId, id));
  await db.delete(roomBlockedSlots).where(eq(roomBlockedSlots.roomId, id));
  await db.delete(rooms).where(and(eq(rooms.id, id), eq(rooms.organizationId, user.organizationId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ROOM_DELETED", entityType: "room", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/rooms");
  return { success: true };
}

const roomSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  capacity: z.coerce.number().int().min(1),
  type: z.string().min(1),
  building: z.string().optional().or(z.literal("")),
  floor: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"])
});

export async function createRoom(formData: FormData) {
  const user = await requirePermission("ROOM_CREATE");
  const parsed = roomSchema.parse({
    name: formData.get("name"), code: formData.get("code"), capacity: formData.get("capacity"),
    type: formData.get("type"), building: formData.get("building"), floor: formData.get("floor"),
    status: formData.get("status") || "ACTIVE"
  });
  await db.insert(rooms).values({
    organizationId: user.organizationId, ...parsed, building: parsed.building || null, floor: parsed.floor || null
  });
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ROOM_CREATED" });
  revalidatePath("/rooms");
}

export async function editRoom(formData: FormData) {
  const user = await requirePermission("ROOM_EDIT");
  const id = formData.get("id") as string;
  const parsed = roomSchema.parse({
    name: formData.get("name"), code: formData.get("code"), capacity: formData.get("capacity"),
    type: formData.get("type"), building: formData.get("building"), floor: formData.get("floor"),
    status: formData.get("status")
  });

  const existing = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Room not found");

  await db.update(rooms).set({
    ...parsed, building: parsed.building || null, floor: parsed.floor || null, updatedAt: new Date().toISOString()
  }).where(and(eq(rooms.id, id), eq(rooms.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "ROOM_EDITED", entityType: "room", entityId: id });
  revalidatePath("/rooms");
}
