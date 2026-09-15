import { db } from "./index";
import { organizations, academicSessions } from "./schema";
import { buildSchedulerInput } from "../scheduler/build-input";
import { generateMultipleAttempts } from "../scheduler/generator";
import { validateSchedule } from "../scheduler/validator";

async function main() {
  const org = await db.query.organizations.findFirst();
  const session = await db.query.academicSessions.findFirst();
  if (!org || !session) throw new Error("Run db:seed first.");

  const input = await buildSchedulerInput({
    organizationId: org.id,
    academicSessionId: session.id,
    weekStartDate: "2026-09-14" // a Monday
  });

  console.log(`Batches: ${input.batches.length}, Faculty: ${input.faculty.length}, Rooms: ${input.rooms.length}, Date/slot combos: ${input.dateSlots.length}`);
  console.log(`Requirement jobs (batch x subject): ${input.requirements.length}, total weekly classes required: ${input.requirements.reduce((s, r) => s + r.classesPerWeek, 0)}`);

  const attempts = generateMultipleAttempts(input, 3);
  for (const [i, a] of attempts.entries()) {
    const conflicts = validateSchedule(a.entries, input);
    console.log(`\nAttempt #${i + 1}: quality=${a.qualityScore} required=${a.requiredTotal} scheduled=${a.scheduledTotal} unscheduled=${a.unscheduled.length} hardConflicts=${conflicts.length}`);
    if (a.unscheduled.length > 0) {
      for (const u of a.unscheduled.slice(0, 3)) {
        console.log(`  - ${u.batchName} / ${u.subjectName}: ${u.scheduled}/${u.required} — ${u.reasons[0] || ""}`);
      }
    }
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
