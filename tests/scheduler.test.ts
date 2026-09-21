import { describe, it, expect } from "vitest";
import { generateAttempt } from "../src/scheduler/generator";
import { validateSchedule } from "../src/scheduler/validator";
import type { SchedulerInput } from "../src/scheduler/types";

function slot(id: string, start: string, end: string, sortOrder: number) {
  return { id, startTime: start, endTime: end, type: "CLASS" as const, sortOrder };
}

function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  const slots = [slot("s1", "08:00", "09:00", 0), slot("s2", "09:00", "10:00", 1), slot("s3", "10:00", "11:00", 2)];
  const dateSlots = [1, 2, 3].flatMap((dayOfWeek, i) =>
    slots.map((s) => ({ date: `2026-09-1${4 + i}`, dayOfWeek, slot: s }))
  );

  const fullAvailability = () => {
    const m = new Map<number, { available: boolean }>();
    for (let d = 0; d <= 6; d++) m.set(d, { available: true });
    return m;
  };

  return {
    weekStartDate: "2026-09-14",
    dateSlots,
    doubtsDateSlots: [],
    batches: [{ id: "b1", name: "Batch 1", studentCount: 40, maxClassesPerDay: 3, maxConsecutiveClasses: 3, availability: fullAvailability() }],
    faculty: [{ id: "f1", name: "Faculty 1", subjectIds: ["sub1"], batchIds: [], maxClassesPerDay: 3, maxClassesPerWeek: 10, availability: fullAvailability(), blockedSlots: [] }],
    rooms: [{ id: "r1", name: "Room 1", capacity: 50, availability: fullAvailability(), blockedSlots: [] }],
    requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 2, minGapDays: 0, eligibleFacultyIds: ["f1"] }],
    lectures: [],
    subjectProgress: new Map(),
    ...overrides
  };
}

describe("scheduler hard constraints", () => {
  it("schedules the required number of classes with no conflicts when feasible", () => {
    const result = generateAttempt(baseInput(), 1);
    expect(result.scheduledTotal).toBe(2);
    expect(result.unscheduled.length).toBe(0);
    expect(validateSchedule(result.entries, baseInput()).length).toBe(0);
  });

  it("never double-books the same batch at the same time", () => {
    const input = baseInput({
      batches: [{ id: "b1", name: "Batch 1", studentCount: 40, maxClassesPerDay: 3, maxConsecutiveClasses: 3, availability: baseInput().batches[0].availability }],
      requirements: [
        { id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 3, minGapDays: 0, eligibleFacultyIds: ["f1"] },
        { id: "b1:sub2", batchId: "b1", subjectId: "sub2", subjectName: "Subject 2", classesPerWeek: 3, minGapDays: 0, eligibleFacultyIds: ["f1"] }
      ]
    });
    const result = generateAttempt(input, 1);
    const conflicts = validateSchedule(result.entries, input);
    expect(conflicts.filter((c) => c.type === "BATCH").length).toBe(0);
  });

  it("respects room capacity — never places a batch bigger than the room", () => {
    const input = baseInput({
      batches: [{ id: "b1", name: "Big Batch", studentCount: 100, maxClassesPerDay: 3, maxConsecutiveClasses: 3, availability: baseInput().batches[0].availability }],
      rooms: [{ id: "r1", name: "Small Room", capacity: 30, availability: baseInput().rooms[0].availability, blockedSlots: [] }]
    });
    const result = generateAttempt(input, 1);
    // Cannot fit — should be reported as unscheduled with a capacity reason, never silently placed
    expect(result.scheduledTotal).toBe(0);
    expect(result.unscheduled.length).toBe(1);
    expect(result.unscheduled[0].reasons.some((r) => r.includes("capacity"))).toBe(true);
  });

  it("respects faculty availability — does not schedule outside available hours", () => {
    const unavailable = new Map<number, { available: boolean }>();
    for (let d = 0; d <= 6; d++) unavailable.set(d, { available: false });
    const input = baseInput({
      faculty: [{ id: "f1", name: "Faculty 1", subjectIds: ["sub1"], batchIds: [], maxClassesPerDay: 3, maxClassesPerWeek: 10, availability: unavailable, blockedSlots: [] }]
    });
    const result = generateAttempt(input, 1);
    expect(result.scheduledTotal).toBe(0);
    expect(result.unscheduled[0].reasons.some((r) => r.includes("not available"))).toBe(true);
  });

  it("respects faculty blocked slots", () => {
    const input = baseInput({
      requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 9, minGapDays: 0, eligibleFacultyIds: ["f1"] }],
      faculty: [{
        id: "f1", name: "Faculty 1", subjectIds: ["sub1"], batchIds: [], maxClassesPerDay: 3, maxClassesPerWeek: 10,
        availability: baseInput().faculty[0].availability,
        blockedSlots: [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }]
      }]
    });
    const result = generateAttempt(input, 1);
    const blockedPlacement = result.entries.some((e) => e.dayOfWeek === 1 && e.startTime === "08:00");
    expect(blockedPlacement).toBe(false);
  });

  it("never exceeds a batch's max classes per day", () => {
    const input = baseInput({
      batches: [{ id: "b1", name: "Batch 1", studentCount: 40, maxClassesPerDay: 1, maxConsecutiveClasses: 3, availability: baseInput().batches[0].availability }],
      requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 9, minGapDays: 0, eligibleFacultyIds: ["f1"] }]
    });
    const result = generateAttempt(input, 1);
    const byDate = new Map<string, number>();
    for (const e of result.entries) byDate.set(e.date, (byDate.get(e.date) || 0) + 1);
    expect(Math.max(...Array.from(byDate.values()))).toBeLessThanOrEqual(1);
  });

  it("reports a detailed reason, not just 'failed', when a requirement cannot be fully scheduled", () => {
    const input = baseInput({
      requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 20, minGapDays: 0, eligibleFacultyIds: ["f1"] }]
    });
    const result = generateAttempt(input, 1);
    expect(result.unscheduled.length).toBe(1);
    expect(result.unscheduled[0].reasons.length).toBeGreaterThan(0);
    expect(result.unscheduled[0].required).toBe(20);
  });
});

describe("chapter sequencing", () => {
  it("advances through a subject's lecture catalog instead of repeating the same chapter", () => {
    const input = baseInput({
      requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 3, minGapDays: 0, eligibleFacultyIds: ["f1"] }],
      lectures: [
        { id: "l1", subjectId: "sub1", code: "SUB-001", name: "Chapter 1", sortOrder: 1 },
        { id: "l2", subjectId: "sub1", code: "SUB-002", name: "Chapter 2", sortOrder: 2 },
        { id: "l3", subjectId: "sub1", code: "SUB-003", name: "Chapter 3", sortOrder: 3 }
      ]
    });
    const result = generateAttempt(input, 1);
    const lectureIds = result.entries.filter((e) => e.subjectId === "sub1").map((e) => e.lectureId).sort();
    expect(lectureIds).toEqual(["l1", "l2", "l3"]);
  });

  it("resumes from stored progress instead of starting over", () => {
    const progress = new Map([["b1:sub1", 1]]); // chapter 1 (sortOrder 1) already taught
    const input = baseInput({
      requirements: [{ id: "b1:sub1", batchId: "b1", subjectId: "sub1", subjectName: "Subject 1", classesPerWeek: 2, minGapDays: 0, eligibleFacultyIds: ["f1"] }],
      lectures: [
        { id: "l1", subjectId: "sub1", code: "SUB-001", name: "Chapter 1", sortOrder: 1 },
        { id: "l2", subjectId: "sub1", code: "SUB-002", name: "Chapter 2", sortOrder: 2 },
        { id: "l3", subjectId: "sub1", code: "SUB-003", name: "Chapter 3", sortOrder: 3 }
      ],
      subjectProgress: progress
    });
    const result = generateAttempt(input, 1);
    const lectureIds = result.entries.filter((e) => e.subjectId === "sub1").map((e) => e.lectureId).sort();
    expect(lectureIds).toEqual(["l2", "l3"]); // not l1 again
  });
});

describe("DOUBTS auto-placement", () => {
  it("places one DOUBTS period per working day using a DOUBTS-type slot", () => {
    const doubtsSlot = { id: "doubts1", startTime: "15:00", endTime: "16:00", type: "DOUBTS" as const, sortOrder: 0 };
    const input = baseInput({
      requirements: [],
      doubtsDateSlots: [1, 2, 3].map((dayOfWeek, i) => ({ date: `2026-09-1${4 + i}`, dayOfWeek, slot: doubtsSlot }))
    });
    const result = generateAttempt(input, 1);
    const doubtsEntries = result.entries.filter((e) => e.classType === "DOUBTS");
    expect(doubtsEntries.length).toBe(3);
    expect(doubtsEntries.every((e) => e.subjectId === null && e.facultyId === null)).toBe(true);
  });

  it("never double-books the batch or room when placing DOUBTS alongside regular classes", () => {
    const doubtsSlot = { id: "doubts1", startTime: "10:00", endTime: "11:00", type: "DOUBTS" as const, sortOrder: 0 };
    const input = baseInput({
      doubtsDateSlots: [1, 2, 3].map((dayOfWeek, i) => ({ date: `2026-09-1${4 + i}`, dayOfWeek, slot: doubtsSlot }))
    });
    const result = generateAttempt(input, 1);
    const conflicts = validateSchedule(
      result.entries.map((e) => ({ ...e })),
      input
    );
    expect(conflicts.filter((c) => c.type === "BATCH" || c.type === "ROOM").length).toBe(0);
  });
});

describe("validator", () => {
  it("detects a manually-introduced double-booking", () => {
    const input = baseInput();
    const entries = [
      { batchId: "b1", subjectId: "sub1", facultyId: "f1", roomId: "r1", date: "2026-09-14", dayOfWeek: 1, startTime: "08:00", endTime: "09:00" },
      { batchId: "b1", subjectId: "sub1", facultyId: "f1", roomId: "r1", date: "2026-09-14", dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }
    ];
    const conflicts = validateSchedule(entries, input);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});
