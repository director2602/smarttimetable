import type { PlacedEntry, SchedulerInput } from "../types";

export interface ValidationConflict {
  type: "BATCH" | "FACULTY" | "ROOM" | "AVAILABILITY" | "CAPACITY";
  message: string;
  entryIds: number[]; // indices into the entries array
}

/**
 * Independent re-validation pass over a full entry set (e.g. after a drag-and-drop
 * move or manual edit). Used to guarantee publish is blocked while hard conflicts exist.
 */
export function validateSchedule(entries: PlacedEntry[], input: SchedulerInput): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];
  const batchById = new Map(input.batches.map((b) => [b.id, b]));
  const roomById = new Map(input.rooms.map((r) => [r.id, r]));

  const overlap = (aS: string, aE: string, bS: string, bE: string) => aS < bE && bS < aE;

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (a.date !== b.date) continue;
      if (!overlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue;

      if (a.batchId === b.batchId) {
        conflicts.push({ type: "BATCH", message: `Batch double-booked on ${a.date} at ${a.startTime}`, entryIds: [i, j] });
      }
      if (a.facultyId === b.facultyId) {
        conflicts.push({ type: "FACULTY", message: `Faculty double-booked on ${a.date} at ${a.startTime}`, entryIds: [i, j] });
      }
      if (a.roomId === b.roomId) {
        conflicts.push({ type: "ROOM", message: `Room double-booked on ${a.date} at ${a.startTime}`, entryIds: [i, j] });
      }
    }
  }

  entries.forEach((e, i) => {
    const batch = batchById.get(e.batchId);
    const room = roomById.get(e.roomId);
    if (batch && room && room.capacity < batch.studentCount) {
      conflicts.push({
        type: "CAPACITY",
        message: `${room.name} (capacity ${room.capacity}) is too small for ${batch.name} (${batch.studentCount} students)`,
        entryIds: [i]
      });
    }
  });

  return conflicts;
}

export function hasHardConflicts(entries: PlacedEntry[], input: SchedulerInput): boolean {
  return validateSchedule(entries, input).length > 0;
}
