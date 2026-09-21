"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, rooms, faculty, subjects, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const baseSchema = z.object({
  timetableId: z.string().min(1),
  batchId: z.string().min(1),
  roomId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  kind: z.enum(["REGULAR", "LABEL"]),
  subjectId: z.string().optional().or(z.literal("")),
  facultyId: z.string().optional().or(z.literal("")),
  label: z.string().optional().or(z.literal(""))
});

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

export async function createManualEntry(formData: FormData) {
  const user = await requirePermission("TIMETABLE_EDIT");
  const parsed = baseSchema.safeParse({
    timetableId: formData.get("timetableId"),
    batchId: formData.get("batchId"),
    roomId: formData.get("roomId"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    kind: formData.get("kind"),
    subjectId: formData.get("subjectId"),
    facultyId: formData.get("facultyId"),
    label: formData.get("label")
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message || "Invalid input" };
  const d = parsed.data;

  if (d.endTime <= d.startTime) return { error: "End time must be after start time" };
  if (d.kind === "REGULAR" && (!d.subjectId || !d.facultyId)) return { error: "Pick a subject and faculty for a regular class" };
  if (d.kind === "LABEL" && !d.label) return { error: "Enter a label (e.g. Self Study, Recordings)" };

  const tt = await db.query.timetables.findFirst({ where: eq(timetables.id, d.timetableId) });
  if (!tt || tt.organizationId !== user.organizationId) return { error: "Timetable not found" };

  const batch = await db.query.batches.findFirst({ where: eq(batches.id, d.batchId) });
  if (!batch || batch.organizationId !== user.organizationId) return { error: "Batch not found" };
  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, d.roomId) });
  if (!room || room.organizationId !== user.organizationId) return { error: "Room not found" };

  let facultyRow = null;
  if (d.kind === "REGULAR") {
    facultyRow = await db.query.faculty.findFirst({ where: eq(faculty.id, d.facultyId as string) });
    if (!facultyRow || facultyRow.organizationId !== user.organizationId) return { error: "Faculty not found" };
    const subj = await db.query.subjects.findFirst({ where: eq(subjects.id, d.subjectId as string) });
    if (!subj || subj.organizationId !== user.organizationId) return { error: "Subject not found" };
  }

  // Server-side conflict check — never silently double-book batch/faculty/room
  const dayEntries = await db.query.timetableEntries.findMany({ where: and(eq(timetableEntries.timetableId, d.timetableId), eq(timetableEntries.date, d.date)) });
  for (const e of dayEntries) {
    if (!timeOverlaps(e.startTime, e.endTime, d.startTime, d.endTime)) continue;
    if (e.batchId === d.batchId) return { error: `${batch.name} already has a class at this time` };
    if (e.roomId === d.roomId) return { error: `${room.name} is already occupied at this time` };
    if (d.kind === "REGULAR" && e.facultyId === d.facultyId) return { error: "This faculty is already teaching another class at this time" };
  }

  await db.insert(timetableEntries).values({
    timetableId: d.timetableId,
    batchId: d.batchId,
    roomId: d.roomId,
    date: d.date,
    dayOfWeek: new Date(d.date).getDay(),
    startTime: d.startTime,
    endTime: d.endTime,
    subjectId: d.kind === "REGULAR" ? (d.subjectId as string) : null,
    facultyId: d.kind === "REGULAR" ? (d.facultyId as string) : null,
    lectureId: null,
    classType: d.kind === "REGULAR" ? "REGULAR" : "OTHER",
    notes: d.kind === "LABEL" ? d.label : null
  });

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "TIMETABLE_ENTRY_ADDED_MANUALLY",
    entityType: "timetable", entityId: d.timetableId
  });

  revalidatePath(`/timetable/${d.timetableId}`);
  return { success: true };
}

export async function deleteManualEntry(entryId: string, timetableId: string) {
  const user = await requirePermission("TIMETABLE_EDIT");
  const tt = await db.query.timetables.findFirst({ where: eq(timetables.id, timetableId) });
  if (!tt || tt.organizationId !== user.organizationId) return { error: "Timetable not found" };

  await db.delete(timetableEntries).where(and(eq(timetableEntries.id, entryId), eq(timetableEntries.timetableId, timetableId)));
  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "TIMETABLE_ENTRY_DELETED", entityType: "timetable", entityId: timetableId });
  revalidatePath(`/timetable/${timetableId}`);
  return { success: true };
}
