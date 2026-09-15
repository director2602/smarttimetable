import type { DateSlot, FacultyDef, RoomDef, BatchDef, PlacedEntry } from "../types";

function timeOverlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

function isBlocked(
  blocked: { date?: string; dayOfWeek?: number; startTime: string; endTime: string }[],
  date: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  return blocked.some((b) => {
    const dateMatches = b.date ? b.date === date : b.dayOfWeek === dayOfWeek;
    return dateMatches && timeOverlaps(startTime, endTime, b.startTime, b.endTime);
  });
}

function withinAvailability(
  availability: Map<number, { available: boolean; startTime?: string; endTime?: string }>,
  dayOfWeek: number,
  startTime: string,
  endTime: string
) {
  const a = availability.get(dayOfWeek);
  if (!a || !a.available) return false;
  if (a.startTime && startTime < a.startTime) return false;
  if (a.endTime && endTime > a.endTime) return false;
  return true;
}

export interface PlacementCandidate {
  dateSlot: DateSlot;
  facultyId: string;
  roomId: string;
}

/**
 * Returns a list of hard-constraint violation reasons for placing a job at this
 * candidate. Empty array = valid placement.
 */
export function checkHardConstraints(params: {
  candidate: PlacementCandidate;
  batch: BatchDef;
  faculty: FacultyDef;
  room: RoomDef;
  existingEntries: PlacedEntry[];
  studentCount: number;
  minGapDays: number;
  subjectId: string;
  batchDailyCount: number;
  facultyDailyCount: number;
  facultyWeeklyCount: number;
}): string[] {
  const { candidate, batch, faculty, room, existingEntries, minGapDays, subjectId, batchDailyCount, facultyDailyCount, facultyWeeklyCount } = params;
  const { date, dayOfWeek, slot } = candidate.dateSlot;
  const reasons: string[] = [];

  // 1. Batch double-booking
  if (existingEntries.some((e) => e.batchId === batch.id && e.date === date && timeOverlaps(e.startTime, e.endTime, slot.startTime, slot.endTime))) {
    reasons.push("Batch already has a class at this time");
  }

  // 2. Faculty double-booking
  if (existingEntries.some((e) => e.facultyId === candidate.facultyId && e.date === date && timeOverlaps(e.startTime, e.endTime, slot.startTime, slot.endTime))) {
    reasons.push("Faculty already teaching another class at this time");
  }

  // 3. Room double-booking
  if (existingEntries.some((e) => e.roomId === candidate.roomId && e.date === date && timeOverlaps(e.startTime, e.endTime, slot.startTime, slot.endTime))) {
    reasons.push("Room already occupied at this time");
  }

  // 4. Faculty availability
  if (!withinAvailability(faculty.availability, dayOfWeek, slot.startTime, slot.endTime)) {
    reasons.push("Faculty not available at this day/time");
  }
  if (isBlocked(faculty.blockedSlots, date, dayOfWeek, slot.startTime, slot.endTime)) {
    reasons.push("Faculty has a blocked period at this time");
  }

  // 5. Room availability
  if (!withinAvailability(room.availability, dayOfWeek, slot.startTime, slot.endTime)) {
    reasons.push("Room not available at this day/time");
  }
  if (isBlocked(room.blockedSlots, date, dayOfWeek, slot.startTime, slot.endTime)) {
    reasons.push("Room has a blocked/maintenance period at this time");
  }

  // 6. Batch availability
  if (!withinAvailability(batch.availability, dayOfWeek, slot.startTime, slot.endTime)) {
    reasons.push("Batch not available at this day/time");
  }

  // 7. Holidays are filtered out before dateSlots are generated (not applicable here)

  // 8. Room capacity
  if (room.capacity < batch.studentCount) {
    reasons.push(`Room capacity (${room.capacity}) is less than batch size (${batch.studentCount})`);
  }

  // 9. Faculty eligible for subject
  if (!faculty.subjectIds.includes(subjectId)) {
    reasons.push("Faculty is not assigned to teach this subject");
  }
  if (faculty.batchIds.length > 0 && !faculty.batchIds.includes(batch.id)) {
    reasons.push("Faculty is not assigned to this batch");
  }

  // 10. Faculty workload
  if (facultyDailyCount >= faculty.maxClassesPerDay) {
    reasons.push("Faculty daily class limit reached");
  }
  if (facultyWeeklyCount >= faculty.maxClassesPerWeek) {
    reasons.push("Faculty weekly class limit reached");
  }

  // 11. Batch max classes/day
  if (batchDailyCount >= batch.maxClassesPerDay) {
    reasons.push("Batch daily class limit reached");
  }

  // 12. Subject spacing (min gap days between two classes of the same subject for this batch)
  if (minGapDays > 0) {
    const sameSubjectDates = existingEntries
      .filter((e) => e.batchId === batch.id && e.subjectId === subjectId)
      .map((e) => new Date(e.date).getTime());
    const thisDate = new Date(date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    if (sameSubjectDates.some((d) => Math.abs(d - thisDate) < minGapDays * dayMs)) {
      reasons.push(`Subject spacing violated (minimum ${minGapDays} day gap required)`);
    }
  }

  return reasons;
}
