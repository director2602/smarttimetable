import { db, sqlite } from "./index";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

async function main() {
  console.log("Seeding S-CUBUS SmartTimetable demo data...");

  const [org] = await db.insert(schema.organizations).values({
    name: "S-CUBUS Coaching Institute",
    slug: "s-cubus"
  }).returning();

  await db.insert(schema.instituteSettings).values({
    organizationId: org.id,
    instituteName: "S-CUBUS — NEET | IIT-JEE | Foundation"
  });

  const passwordHash = await bcrypt.hash("Admin@12345", 10);
  const [owner] = await db.insert(schema.users).values({
    organizationId: org.id,
    name: "Owner",
    email: "owner@demo.local",
    passwordHash,
    role: "OWNER",
    status: "ACTIVE"
  }).returning();

  const [session] = await db.insert(schema.academicSessions).values({
    organizationId: org.id,
    name: "2026-27",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true
  }).returning();

  // Working days: Monday-Saturday
  for (let d = 1; d <= 6; d++) {
    await db.insert(schema.workingDays).values({ organizationId: org.id, dayOfWeek: d, isWorking: true });
  }
  await db.insert(schema.workingDays).values({ organizationId: org.id, dayOfWeek: 0, isWorking: false });

  // Time slots
  const slotDefs = [
    ["07:00", "08:00", "CLASS"],
    ["08:00", "09:00", "CLASS"],
    ["09:00", "10:00", "CLASS"],
    ["10:00", "10:30", "BREAK"],
    ["10:30", "11:30", "CLASS"],
    ["11:30", "12:30", "CLASS"],
    ["12:30", "13:30", "CLASS"],
    ["13:30", "14:00", "BREAK"],
    ["14:00", "15:00", "CLASS"],
    ["15:00", "16:00", "CLASS"],
    ["16:00", "17:00", "CLASS"]
  ] as const;
  for (let i = 0; i < slotDefs.length; i++) {
    const [start, end, type] = slotDefs[i];
    await db.insert(schema.timeSlots).values({ organizationId: org.id, startTime: start, endTime: end, type, sortOrder: i });
  }

  // Holidays
  await db.insert(schema.holidays).values([
    { organizationId: org.id, date: "2026-10-02", name: "Gandhi Jayanti" },
    { organizationId: org.id, date: "2026-11-08", name: "Diwali" }
  ]);

  // Courses
  const courseNames = [
    "8th Foundation", "9th Foundation", "10th Foundation",
    "11th JEE", "11th NEET", "12th JEE", "12th NEET", "12th Pass NEET", "12th Pass JEE"
  ];
  const courseByName: Record<string, string> = {};
  for (const name of courseNames) {
    const code = name.replace(/\s+/g, "-").toUpperCase();
    const [c] = await db.insert(schema.courses).values({ organizationId: org.id, name, code }).returning();
    courseByName[name] = c.id;
  }

  // Subjects
  const subjectDefs = ["Physics", "Chemistry", "Mathematics", "Biology", "Science", "English", "Social Science", "Mental Ability"];
  const subjectByName: Record<string, string> = {};
  for (const name of subjectDefs) {
    const [s] = await db.insert(schema.subjects).values({ organizationId: org.id, name, code: name.toUpperCase().slice(0, 4) }).returning();
    subjectByName[name] = s.id;
  }

  // Rooms
  const roomDefs: [string, string, number, string][] = [
    ["Room 101", "R101", 60, "CLASSROOM"],
    ["Room 102", "R102", 60, "CLASSROOM"],
    ["Room 103", "R103", 50, "CLASSROOM"],
    ["Room 104", "R104", 50, "CLASSROOM"],
    ["Room 105", "R105", 50, "CLASSROOM"],
    ["Room 106", "R106", 50, "CLASSROOM"],
    ["Room 107", "R107", 50, "CLASSROOM"],
    ["Room 108", "R108", 50, "CLASSROOM"],
    ["Physics Lab", "PLAB", 40, "LAB"],
    ["Chemistry Lab", "CLAB", 40, "LAB"],
    ["Auditorium", "AUD", 150, "AUDITORIUM"]
  ];
  const roomIds: string[] = [];
  for (const [name, code, capacity, type] of roomDefs) {
    const [r] = await db.insert(schema.rooms).values({ organizationId: org.id, name, code, capacity, type }).returning();
    roomIds.push(r.id);
  }

  // Faculty
  const facultyDefs: { name: string; empId: string; subjects: string[] }[] = [
    { name: "Rahul Sharma", empId: "F001", subjects: ["Physics"] },
    { name: "Anita Verma", empId: "F002", subjects: ["Chemistry"] },
    { name: "Sanjay Gupta", empId: "F003", subjects: ["Mathematics"] },
    { name: "Priya Nair", empId: "F004", subjects: ["Biology"] },
    { name: "Deepak Menon", empId: "F009", subjects: ["Biology"] },
    { name: "Vikram Rao", empId: "F005", subjects: ["Physics", "Science"] },
    { name: "Meera Iyer", empId: "F006", subjects: ["Chemistry", "Science"] },
    { name: "Arjun Singh", empId: "F007", subjects: ["Mathematics", "Mental Ability"] },
    { name: "Kavita Joshi", empId: "F008", subjects: ["English"] },
    { name: "Suresh Pillai", empId: "F010", subjects: ["Social Science"] }
  ];
  const facultyIds: { id: string; subjects: string[] }[] = [];
  for (const f of facultyDefs) {
    const [row] = await db.insert(schema.faculty).values({
      organizationId: org.id, name: f.name, employeeId: f.empId,
      maxClassesPerDay: 6, maxClassesPerWeek: 30
    }).returning();
    facultyIds.push({ id: row.id, subjects: f.subjects });
    for (const subjName of f.subjects) {
      await db.insert(schema.facultySubjects).values({ facultyId: row.id, subjectId: subjectByName[subjName] });
    }
    // Full availability Mon-Sat
    for (let d = 1; d <= 6; d++) {
      await db.insert(schema.facultyAvailability).values({ facultyId: row.id, dayOfWeek: d, available: true, startTime: "07:00", endTime: "17:00" });
    }
    await db.insert(schema.facultyAvailability).values({ facultyId: row.id, dayOfWeek: 0, available: false });
  }
  // Example blocked slot from the spec: Rahul unavailable Wed 14:00-16:00
  await db.insert(schema.facultyBlockedSlots).values({
    facultyId: facultyIds[0].id, dayOfWeek: 3, startTime: "14:00", endTime: "16:00", reason: "Personal commitment"
  });

  // Batches + requirements per course
  const batchPlan: Record<string, { code: string; count: number; subjects: { name: string; perWeek: number }[] }> = {
    "8th Foundation": { code: "8", count: 2, subjects: [
      { name: "Mathematics", perWeek: 5 }, { name: "Science", perWeek: 5 }, { name: "English", perWeek: 3 },
      { name: "Social Science", perWeek: 3 }, { name: "Mental Ability", perWeek: 2 }
    ] },
    "9th Foundation": { code: "9", count: 2, subjects: [
      { name: "Mathematics", perWeek: 5 }, { name: "Science", perWeek: 5 }, { name: "English", perWeek: 3 },
      { name: "Social Science", perWeek: 3 }, { name: "Mental Ability", perWeek: 2 }
    ] },
    "10th Foundation": { code: "10", count: 2, subjects: [
      { name: "Mathematics", perWeek: 6 }, { name: "Science", perWeek: 6 }, { name: "English", perWeek: 3 },
      { name: "Social Science", perWeek: 3 }
    ] },
    "11th JEE": { code: "JEE-11", count: 2, subjects: [
      { name: "Physics", perWeek: 5 }, { name: "Chemistry", perWeek: 5 }, { name: "Mathematics", perWeek: 6 }
    ] },
    "11th NEET": { code: "NEET-11", count: 2, subjects: [
      { name: "Physics", perWeek: 5 }, { name: "Chemistry", perWeek: 5 }, { name: "Biology", perWeek: 7 }
    ] },
    "12th JEE": { code: "JEE-12", count: 2, subjects: [
      { name: "Physics", perWeek: 5 }, { name: "Chemistry", perWeek: 5 }, { name: "Mathematics", perWeek: 6 }
    ] },
    "12th NEET": { code: "NEET-12", count: 2, subjects: [
      { name: "Physics", perWeek: 5 }, { name: "Chemistry", perWeek: 5 }, { name: "Biology", perWeek: 7 }
    ] },
    "12th Pass NEET": { code: "NEETP", count: 1, subjects: [
      { name: "Physics", perWeek: 6 }, { name: "Chemistry", perWeek: 6 }, { name: "Biology", perWeek: 8 }
    ] },
    "12th Pass JEE": { code: "JEEP", count: 1, subjects: [
      { name: "Physics", perWeek: 6 }, { name: "Chemistry", perWeek: 6 }, { name: "Mathematics", perWeek: 8 }
    ] }
  };

  const letters = ["A", "B", "C", "D"];
  for (const [courseName, plan] of Object.entries(batchPlan)) {
    for (let i = 0; i < plan.count; i++) {
      const name = `${plan.code}-${letters[i]}`;
      const [batch] = await db.insert(schema.batches).values({
        organizationId: org.id,
        courseId: courseByName[courseName],
        academicSessionId: session.id,
        name,
        code: `${plan.code}-${letters[i]}-${nanoid(4)}`,
        studentCount: 45,
        maxClassesPerDay: 6,
        maxConsecutiveClasses: 3
      }).returning();

      for (let d = 1; d <= 6; d++) {
        await db.insert(schema.batchAvailability).values({ batchId: batch.id, dayOfWeek: d, available: true, startTime: "07:00", endTime: "17:00" });
      }
      await db.insert(schema.batchAvailability).values({ batchId: batch.id, dayOfWeek: 0, available: false });

      for (const s of plan.subjects) {
        await db.insert(schema.batchSubjectRequirements).values({
          batchId: batch.id, subjectId: subjectByName[s.name], classesPerWeek: s.perWeek, minGapDays: 0
        });
      }

      // Assign faculty who teach the relevant subjects to this batch
      const relevantSubjects = plan.subjects.map((s) => s.name);
      for (const f of facultyIds) {
        if (f.subjects.some((s) => relevantSubjects.includes(s))) {
          await db.insert(schema.facultyBatches).values({ facultyId: f.id, batchId: batch.id }).onConflictDoNothing();
        }
      }
    }
  }

  console.log("Seed complete.");
  console.log("Owner login: owner@demo.local / Admin@12345");
  sqlite.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
