import type { SchedulerInput, PlacedEntry, RequirementJob, UnscheduledReason, SchedulerResult } from "../types";
import { checkHardConstraints, type PlacementCandidate } from "../constraints/hard";
import { scoreCandidate } from "../scoring";

interface Job {
  requirement: RequirementJob;
  occurrenceIndex: number; // which instance of the week (1..classesPerWeek)
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a single timetable attempt. `seed` varies randomization for tie-breaking
 * among equally-scored candidates, enabling "Generate Again" to explore alternatives.
 */
export function generateAttempt(input: SchedulerInput, seed = 1): SchedulerResult {
  const batchById = new Map(input.batches.map((b) => [b.id, b]));
  const facultyById = new Map(input.faculty.map((f) => [f.id, f]));
  const roomById = new Map(input.rooms.map((r) => [r.id, r]));

  // Build jobs: one job per required weekly occurrence, most-constrained-first.
  let jobs: Job[] = [];
  for (const req of input.requirements) {
    for (let i = 1; i <= req.classesPerWeek; i++) {
      jobs.push({ requirement: req, occurrenceIndex: i });
    }
  }

  // Rank difficulty: fewer eligible faculty + fewer available date slots = harder = scheduled first
  jobs = seededShuffle(jobs, seed);
  jobs.sort((a, b) => {
    const diffA = a.requirement.eligibleFacultyIds.length;
    const diffB = b.requirement.eligibleFacultyIds.length;
    return diffA - diffB;
  });

  const entries: PlacedEntry[] = [];
  const unscheduled: UnscheduledReason[] = [];
  const warnings: string[] = [];

  const facultyDailyCount = new Map<string, number>(); // `${facultyId}:${date}`
  const facultyWeeklyCount = new Map<string, number>(); // facultyId
  const batchDailyCount = new Map<string, number>(); // `${batchId}:${date}`

  const keyFD = (f: string, d: string) => `${f}:${d}`;
  const keyBD = (b: string, d: string) => `${b}:${d}`;

  for (const job of jobs) {
    const { requirement } = job;
    const batch = batchById.get(requirement.batchId);
    if (!batch) continue;

    const candidateReasonsSample = new Set<string>();
    let best: { candidate: PlacementCandidate; score: number } | null = null;

    const facultyOptions = requirement.eligibleFacultyIds.length
      ? requirement.eligibleFacultyIds
      : input.faculty.filter((f) => f.subjectIds.includes(requirement.subjectId)).map((f) => f.id);

    for (const dateSlot of input.dateSlots) {
      for (const facultyId of facultyOptions) {
        const faculty = facultyById.get(facultyId);
        if (!faculty) continue;

        for (const room of input.rooms) {
          const candidate: PlacementCandidate = { dateSlot, facultyId, roomId: room.id };
          const fCount = facultyDailyCount.get(keyFD(facultyId, dateSlot.date)) || 0;
          const fWeek = facultyWeeklyCount.get(facultyId) || 0;
          const bCount = batchDailyCount.get(keyBD(batch.id, dateSlot.date)) || 0;

          const violations = checkHardConstraints({
            candidate,
            batch,
            faculty,
            room,
            existingEntries: entries,
            studentCount: batch.studentCount,
            minGapDays: requirement.minGapDays,
            subjectId: requirement.subjectId,
            batchDailyCount: bCount,
            facultyDailyCount: fCount,
            facultyWeeklyCount: fWeek
          });

          if (violations.length > 0) {
            violations.forEach((v) => candidateReasonsSample.add(v));
            continue;
          }

          const score = scoreCandidate({
            candidate,
            batchId: batch.id,
            subjectId: requirement.subjectId,
            existingEntries: entries,
            facultyWeeklyCount: fWeek,
            facultyMaxWeekly: faculty.maxClassesPerWeek
          });

          if (!best || score > best.score) {
            best = { candidate, score };
          }
        }
      }
    }

    if (best) {
      const { dateSlot, facultyId, roomId } = best.candidate;
      entries.push({
        batchId: batch.id,
        subjectId: requirement.subjectId,
        facultyId,
        roomId,
        date: dateSlot.date,
        dayOfWeek: dateSlot.dayOfWeek,
        startTime: dateSlot.slot.startTime,
        endTime: dateSlot.slot.endTime
      });
      facultyDailyCount.set(keyFD(facultyId, dateSlot.date), (facultyDailyCount.get(keyFD(facultyId, dateSlot.date)) || 0) + 1);
      facultyWeeklyCount.set(facultyId, (facultyWeeklyCount.get(facultyId) || 0) + 1);
      batchDailyCount.set(keyBD(batch.id, dateSlot.date), (batchDailyCount.get(keyBD(batch.id, dateSlot.date)) || 0) + 1);
    } else {
      let entry = unscheduled.find((u) => u.batchId === requirement.batchId && u.subjectId === requirement.subjectId);
      if (!entry) {
        entry = {
          batchId: requirement.batchId,
          batchName: batch.name,
          subjectId: requirement.subjectId,
          subjectName: requirement.subjectName,
          required: requirement.classesPerWeek,
          scheduled: 0,
          reasons: []
        };
        unscheduled.push(entry);
      }
      const topReasons = Array.from(candidateReasonsSample).slice(0, 4);
      entry.reasons = Array.from(new Set([...entry.reasons, ...topReasons]));
    }
  }

  // Fill in "scheduled" counts for unscheduled report
  for (const u of unscheduled) {
    u.scheduled = entries.filter((e) => e.batchId === u.batchId && e.subjectId === u.subjectId).length;
  }

  const requiredTotal = input.requirements.reduce((sum, r) => sum + r.classesPerWeek, 0);
  const scheduledTotal = entries.length;

  // Quality score: fulfilment (0-70) + soft-constraint health (0-30, approximated via
  // penalties already baked into placement choice — here we estimate spread & gaps)
  const fulfilmentScore = requiredTotal > 0 ? (scheduledTotal / requiredTotal) * 70 : 0;
  const spreadPenalty = estimateSpreadPenalty(entries, input);
  const qualityScore = requiredTotal > 0
    ? Math.max(0, Math.min(100, Math.round(fulfilmentScore + (30 - spreadPenalty))))
    : 0;

  if (requiredTotal === 0) {
    warnings.push("No weekly subject requirements are configured for any batch — there is nothing for the scheduler to place. Add requirements under Batches before generating.");
  } else if (unscheduled.length > 0) {
    warnings.push(`${unscheduled.length} batch/subject requirement(s) could not be fully scheduled.`);
  }

  return { entries, requiredTotal, scheduledTotal, unscheduled, qualityScore, warnings };
}

function estimateSpreadPenalty(entries: PlacedEntry[], input: SchedulerInput): number {
  // Penalize batches whose classes are unevenly distributed across working days.
  let penalty = 0;
  for (const batch of input.batches) {
    const byDay = new Map<string, number>();
    for (const e of entries.filter((x) => x.batchId === batch.id)) {
      byDay.set(e.date, (byDay.get(e.date) || 0) + 1);
    }
    const counts = Array.from(byDay.values());
    if (counts.length === 0) continue;
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    penalty += (max - min) * 0.5;
  }
  return Math.min(30, penalty);
}

/**
 * Run multiple attempts with different seeds and return all of them so the
 * caller (UI) can show "Generation #1 — 87 / #2 — 92 / #3 — 95" and let the
 * admin pick the best.
 */
export function generateMultipleAttempts(input: SchedulerInput, attempts = 3): SchedulerResult[] {
  const results: SchedulerResult[] = [];
  for (let i = 0; i < attempts; i++) {
    results.push(generateAttempt(input, i + 1));
  }
  return results.sort((a, b) => b.qualityScore - a.qualityScore);
}
