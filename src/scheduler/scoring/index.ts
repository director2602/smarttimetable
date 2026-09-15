import type { PlacedEntry } from "../types";
import type { PlacementCandidate } from "../constraints/hard";

/**
 * Higher score = more preferable placement. Used to rank valid candidates,
 * not to allow/deny them (hard constraints already filtered those out).
 */
export function scoreCandidate(params: {
  candidate: PlacementCandidate;
  batchId: string;
  subjectId: string;
  existingEntries: PlacedEntry[];
  facultyWeeklyCount: number;
  facultyMaxWeekly: number;
}): number {
  const { candidate, batchId, subjectId, existingEntries, facultyWeeklyCount, facultyMaxWeekly } = params;
  const { date, slot } = candidate.dateSlot;
  let score = 100;

  // Prefer balanced load across days: penalize days that already have many classes for this batch
  const sameDayBatchCount = existingEntries.filter((e) => e.batchId === batchId && e.date === date).length;
  score -= sameDayBatchCount * 4;

  // Avoid the same subject on consecutive days for this batch
  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const prevIso = prevDay.toISOString().slice(0, 10);
  const nextIso = nextDay.toISOString().slice(0, 10);
  const adjacentSameSubject = existingEntries.some(
    (e) => e.batchId === batchId && e.subjectId === subjectId && (e.date === prevIso || e.date === nextIso)
  );
  if (adjacentSameSubject) score -= 15;

  // Avoid excessive consecutive classes for the batch (same day, adjacent slot)
  const sameDayEntries = existingEntries.filter((e) => e.batchId === batchId && e.date === date);
  const isAdjacentToExisting = sameDayEntries.some(
    (e) => e.endTime === slot.startTime || e.startTime === slot.endTime
  );
  if (isAdjacentToExisting) score -= 3; // mild penalty, some consecutiveness is fine/expected

  // Balance faculty workload across the week (avoid front/back-loading one faculty)
  const facultyLoadRatio = facultyMaxWeekly > 0 ? facultyWeeklyCount / facultyMaxWeekly : 0;
  score -= facultyLoadRatio * 10;

  // Mild preference for earlier slots over very late ones
  score -= (slot.sortOrder || 0) * 0.2;

  return score;
}
