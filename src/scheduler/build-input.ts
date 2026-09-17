import { db } from "@/db";
import {
  batches, batchSubjectRequirements, batchAvailability, batchTimeSlots, subjects,
  faculty, facultySubjects, facultyBatches, facultyAvailability, facultyBlockedSlots,
  rooms, roomAvailability, roomBlockedSlots,
  timeSlots, holidays, workingDays
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { SchedulerInput, DateSlot, FacultyDef, RoomDef, BatchDef, RequirementJob } from "./types";

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function availabilityMap(rows: { dayOfWeek: number; available: boolean; startTime: string | null; endTime: string | null }[]) {
  const m = new Map<number, { available: boolean; startTime?: string; endTime?: string }>();
  for (const r of rows) {
    m.set(r.dayOfWeek, { available: r.available, startTime: r.startTime || undefined, endTime: r.endTime || undefined });
  }
  return m;
}

export async function buildSchedulerInput(params: {
  organizationId: string;
  academicSessionId: string;
  weekStartDate: string; // ISO date of Monday
  courseId?: string;
  batchId?: string;
}): Promise<SchedulerInput> {
  const orgId = params.organizationId;

  const [allSlots, allHolidays, allWorkingDays] = await Promise.all([
    db.query.timeSlots.findMany({ where: and(eq(timeSlots.organizationId, orgId), eq(timeSlots.type, "CLASS")) }),
    db.query.holidays.findMany({ where: eq(holidays.organizationId, orgId) }),
    db.query.workingDays.findMany({ where: eq(workingDays.organizationId, orgId) })
  ]);

  const holidayDates = new Set(allHolidays.map((h) => h.date));
  const workingDaySet = new Set(
    allWorkingDays.length
      ? allWorkingDays.filter((w) => w.isWorking).map((w) => w.dayOfWeek)
      : [1, 2, 3, 4, 5, 6] // default Mon-Sat if not configured
  );

  const dateSlots: DateSlot[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(params.weekStartDate, i);
    const dayOfWeek = new Date(date).getDay();
    if (!workingDaySet.has(dayOfWeek)) continue;
    if (holidayDates.has(date)) continue;
    const slotsForThisDay = allSlots
      .filter((s) => s.dayOfWeek === null || s.dayOfWeek === undefined || s.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    for (const s of slotsForThisDay) {
      dateSlots.push({ date, dayOfWeek, slot: { id: s.id, startTime: s.startTime, endTime: s.endTime, type: "CLASS", sortOrder: s.sortOrder } });
    }
  }

  const batchWhere = params.batchId
    ? and(eq(batches.organizationId, orgId), eq(batches.id, params.batchId))
    : params.courseId
    ? and(eq(batches.organizationId, orgId), eq(batches.courseId, params.courseId), eq(batches.status, "ACTIVE"))
    : and(eq(batches.organizationId, orgId), eq(batches.academicSessionId, params.academicSessionId), eq(batches.status, "ACTIVE"));

  const batchRows = await db.query.batches.findMany({ where: batchWhere });
  const batchDefs: BatchDef[] = [];
  const requirements: RequirementJob[] = [];
  const subjectRows = await db.query.subjects.findMany({ where: eq(subjects.organizationId, orgId) });
  const subjectById = new Map(subjectRows.map((s) => [s.id, s]));

  for (const b of batchRows) {
    const availRows = await db.query.batchAvailability.findMany({ where: eq(batchAvailability.batchId, b.id) });
    const slotRows = await db.query.batchTimeSlots.findMany({ where: eq(batchTimeSlots.batchId, b.id) });
    batchDefs.push({
      id: b.id,
      name: b.name,
      studentCount: b.studentCount,
      maxClassesPerDay: b.maxClassesPerDay,
      maxConsecutiveClasses: b.maxConsecutiveClasses,
      availability: availRows.length ? availabilityMap(availRows) : defaultAvailability(workingDaySet),
      allowedSlotIds: slotRows.length ? new Set(slotRows.map((s) => s.timeSlotId)) : undefined
    });

    const reqRows = await db.query.batchSubjectRequirements.findMany({ where: eq(batchSubjectRequirements.batchId, b.id) });
    for (const r of reqRows) {
      const subj = subjectById.get(r.subjectId);
      const facultyForSubject = await db.query.facultySubjects.findMany({ where: eq(facultySubjects.subjectId, r.subjectId) });
      const facultyForBatch = await db.query.facultyBatches.findMany({ where: eq(facultyBatches.batchId, b.id) });
      const batchFacultyIds = new Set(facultyForBatch.map((x) => x.facultyId));
      const eligible = facultyForSubject.map((x) => x.facultyId).filter((fid) => batchFacultyIds.size === 0 || batchFacultyIds.has(fid));

      requirements.push({
        id: `${b.id}:${r.subjectId}`,
        batchId: b.id,
        subjectId: r.subjectId,
        subjectName: subj?.name || "Unknown Subject",
        classesPerWeek: r.classesPerWeek,
        minGapDays: r.minGapDays,
        eligibleFacultyIds: eligible
      });
    }
  }

  const facultyRows = await db.query.faculty.findMany({ where: and(eq(faculty.organizationId, orgId), eq(faculty.status, "ACTIVE")) });
  const facultyDefs: FacultyDef[] = [];
  for (const f of facultyRows) {
    const [subjRows, batchRowsF, availRows, blockedRows] = await Promise.all([
      db.query.facultySubjects.findMany({ where: eq(facultySubjects.facultyId, f.id) }),
      db.query.facultyBatches.findMany({ where: eq(facultyBatches.facultyId, f.id) }),
      db.query.facultyAvailability.findMany({ where: eq(facultyAvailability.facultyId, f.id) }),
      db.query.facultyBlockedSlots.findMany({ where: eq(facultyBlockedSlots.facultyId, f.id) })
    ]);
    facultyDefs.push({
      id: f.id,
      name: f.name,
      subjectIds: subjRows.map((s) => s.subjectId),
      batchIds: batchRowsF.map((b) => b.batchId),
      maxClassesPerDay: f.maxClassesPerDay,
      maxClassesPerWeek: f.maxClassesPerWeek,
      availability: availRows.length ? availabilityMap(availRows) : defaultAvailability(workingDaySet),
      blockedSlots: blockedRows.map((b) => ({ date: b.date || undefined, dayOfWeek: b.dayOfWeek ?? undefined, startTime: b.startTime, endTime: b.endTime }))
    });
  }

  const roomRows = await db.query.rooms.findMany({ where: and(eq(rooms.organizationId, orgId), eq(rooms.status, "ACTIVE")) });
  const roomDefs: RoomDef[] = [];
  for (const r of roomRows) {
    const [availRows, blockedRows] = await Promise.all([
      db.query.roomAvailability.findMany({ where: eq(roomAvailability.roomId, r.id) }),
      db.query.roomBlockedSlots.findMany({ where: eq(roomBlockedSlots.roomId, r.id) })
    ]);
    roomDefs.push({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      availability: availRows.length ? availabilityMap(availRows) : defaultAvailability(workingDaySet),
      blockedSlots: blockedRows.map((b) => ({ date: b.date || undefined, dayOfWeek: b.dayOfWeek ?? undefined, startTime: b.startTime, endTime: b.endTime }))
    });
  }

  return {
    weekStartDate: params.weekStartDate,
    dateSlots,
    batches: batchDefs,
    faculty: facultyDefs,
    rooms: roomDefs,
    requirements
  };
}

function defaultAvailability(workingDaySet: Set<number>) {
  const m = new Map<number, { available: boolean }>();
  for (let d = 0; d <= 6; d++) m.set(d, { available: workingDaySet.has(d) });
  return m;
}
