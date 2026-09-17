import { db } from "@/db";
import {
  courses, subjects, rooms, timeSlots, holidays, workingDays,
  batches, batchAvailability, batchSubjectRequirements, academicSessions,
  faculty, facultyAvailability, facultySubjects, facultyBatches,
  timetables, timetableEntries, auditLogs
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import * as XLSX from "xlsx";
import { buildSchedulerInput } from "@/scheduler/build-input";
import { generateMultipleAttempts } from "@/scheduler/generator";

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + (day === 1 ? 0 : diff));
  return d.toISOString().slice(0, 10);
}

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, any>[] {
  const sheetName = wb.SheetNames.find((n) => n.toLowerCase() === name.toLowerCase());
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[sheetName], { defval: "" });
}

interface SectionReport {
  section: string;
  processed: number;
  created: number;
  updated: number;
  warnings: string[];
}

export async function runBulkImport(orgId: string, userId: string, buffer: Buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });

  const reports: SectionReport[] = [];

  // ---------- Courses ----------
  const courseRows = sheetRows(wb, "Courses");
  const courseReport: SectionReport = { section: "Courses", processed: courseRows.length, created: 0, updated: 0, warnings: [] };
  const existingCourses = await db.query.courses.findMany({ where: eq(courses.organizationId, orgId) });
  const courseByCode = new Map(existingCourses.map((c) => [c.code.toLowerCase(), c]));
  for (const r of courseRows) {
    const name = String(r["Name"] || "").trim();
    const code = String(r["Code"] || "").trim();
    if (!name || !code) { courseReport.warnings.push(`Skipped a row with missing Name/Code`); continue; }
    const existing = courseByCode.get(code.toLowerCase());
    if (existing) {
      await db.update(courses).set({ name }).where(eq(courses.id, existing.id));
      courseReport.updated++;
    } else {
      const [row] = await db.insert(courses).values({ organizationId: orgId, name, code }).returning();
      courseByCode.set(code.toLowerCase(), row);
      courseReport.created++;
    }
  }
  reports.push(courseReport);

  // ---------- Subjects ----------
  const subjectRows = sheetRows(wb, "Subjects");
  const subjectReport: SectionReport = { section: "Subjects", processed: subjectRows.length, created: 0, updated: 0, warnings: [] };
  const existingSubjects = await db.query.subjects.findMany({ where: eq(subjects.organizationId, orgId) });
  const subjectByCode = new Map(existingSubjects.map((s) => [s.code.toLowerCase(), s]));
  const subjectByName = new Map(existingSubjects.map((s) => [s.name.toLowerCase(), s]));
  for (const r of subjectRows) {
    const name = String(r["Name"] || "").trim();
    const code = String(r["Code"] || "").trim();
    if (!name || !code) { subjectReport.warnings.push(`Skipped a row with missing Name/Code`); continue; }
    const existing = subjectByCode.get(code.toLowerCase());
    if (existing) {
      await db.update(subjects).set({ name }).where(eq(subjects.id, existing.id));
      subjectByName.set(name.toLowerCase(), { ...existing, name });
      subjectReport.updated++;
    } else {
      const [row] = await db.insert(subjects).values({ organizationId: orgId, name, code }).returning();
      subjectByCode.set(code.toLowerCase(), row);
      subjectByName.set(name.toLowerCase(), row);
      subjectReport.created++;
    }
  }
  reports.push(subjectReport);

  // ---------- Rooms ----------
  const roomRows = sheetRows(wb, "Rooms");
  const roomReport: SectionReport = { section: "Rooms", processed: roomRows.length, created: 0, updated: 0, warnings: [] };
  const existingRooms = await db.query.rooms.findMany({ where: eq(rooms.organizationId, orgId) });
  const roomByCode = new Map(existingRooms.map((r) => [r.code.toLowerCase(), r]));
  for (const r of roomRows) {
    const name = String(r["Name"] || "").trim();
    const code = String(r["Code"] || "").trim();
    const capacity = Number(r["Capacity"]) || 0;
    if (!name || !code || capacity <= 0) { roomReport.warnings.push(`Skipped a row with missing Name/Code/Capacity`); continue; }
    const type = String(r["Type"] || "CLASSROOM").trim();
    const building = String(r["Building"] || "").trim() || null;
    const existing = roomByCode.get(code.toLowerCase());
    if (existing) {
      await db.update(rooms).set({ name, capacity, type, building }).where(eq(rooms.id, existing.id));
      roomReport.updated++;
    } else {
      await db.insert(rooms).values({ organizationId: orgId, name, code, capacity, type, building, status: "ACTIVE" });
      roomReport.created++;
    }
  }
  reports.push(roomReport);

  // ---------- Time Slots ----------
  const slotRows = sheetRows(wb, "TimeSlots");
  const slotReport: SectionReport = { section: "Time Slots", processed: slotRows.length, created: 0, updated: 0, warnings: [] };
  const existingSlots = await db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, orgId) });
  let nextSort = existingSlots.length ? Math.max(...existingSlots.map((s) => s.sortOrder)) + 1 : 0;
  for (const r of slotRows) {
    const start = String(r["Start"] || "").trim();
    const end = String(r["End"] || "").trim();
    const type = (String(r["Type"] || "CLASS").trim().toUpperCase()) as "CLASS" | "BREAK" | "DOUBTS" | "DAY" | "DATE";
    if (!start || !end) { slotReport.warnings.push(`Skipped a row with missing Start/End`); continue; }
    const dup = existingSlots.find((s) => s.startTime === start && s.endTime === end && s.type === type);
    if (dup) { slotReport.warnings.push(`Slot ${start}-${end} (${type}) already exists — skipped`); continue; }
    await db.insert(timeSlots).values({ organizationId: orgId, startTime: start, endTime: end, type, sortOrder: nextSort++ });
    slotReport.created++;
  }
  reports.push(slotReport);

  // ---------- Holidays ----------
  const holidayRows = sheetRows(wb, "Holidays");
  const holidayReport: SectionReport = { section: "Holidays", processed: holidayRows.length, created: 0, updated: 0, warnings: [] };
  const existingHolidays = await db.query.holidays.findMany({ where: eq(holidays.organizationId, orgId) });
  const holidayByDate = new Map(existingHolidays.map((h) => [h.date, h]));
  for (const r of holidayRows) {
    const date = String(r["Date"] || "").trim();
    const name = String(r["Name"] || "").trim();
    if (!date || !name) { holidayReport.warnings.push(`Skipped a row with missing Date/Name`); continue; }
    const existing = holidayByDate.get(date);
    if (existing) {
      await db.update(holidays).set({ name }).where(eq(holidays.id, existing.id));
      holidayReport.updated++;
    } else {
      await db.insert(holidays).values({ organizationId: orgId, date, name });
      holidayReport.created++;
    }
  }
  reports.push(holidayReport);

  // ---------- Ensure academic session + working days exist ----------
  let activeSession = await db.query.academicSessions.findFirst({ where: and(eq(academicSessions.organizationId, orgId), eq(academicSessions.active, true)) });
  if (!activeSession) {
    const year = new Date().getFullYear();
    const [row] = await db.insert(academicSessions).values({
      organizationId: orgId, name: `${year}-${String(year + 1).slice(2)}`,
      startDate: `${year}-04-01`, endDate: `${year + 1}-03-31`, active: true
    }).returning();
    activeSession = row;
  }
  const existingWorkingDays = await db.query.workingDays.findMany({ where: eq(workingDays.organizationId, orgId) });
  if (existingWorkingDays.length === 0) {
    for (let d = 0; d <= 6; d++) {
      await db.insert(workingDays).values({ organizationId: orgId, dayOfWeek: d, isWorking: d !== 0 });
    }
  }

  // ---------- Batches (+ subject requirements) ----------
  const batchRows = sheetRows(wb, "Batches");
  const batchReport: SectionReport = { section: "Batches", processed: batchRows.length, created: 0, updated: 0, warnings: [] };
  const currentCourses = await db.query.courses.findMany({ where: eq(courses.organizationId, orgId) });
  const courseByName = new Map(currentCourses.map((c) => [c.name.toLowerCase(), c]));
  const existingBatches = await db.query.batches.findMany({ where: eq(batches.organizationId, orgId) });
  const batchByCode = new Map(existingBatches.map((b) => [b.code.toLowerCase(), b]));

  for (let i = 0; i < batchRows.length; i++) {
    const r = batchRows[i];
    const rowNum = i + 2;
    const courseName = String(r["Course"] || "").trim();
    const batchName = String(r["Batch Name"] || "").trim();
    const batchCode = String(r["Batch Code"] || batchName).trim();
    const studentCount = Number(r["Student Count"]) || 0;
    const maxPerDay = Number(r["Max Per Day"]) || 6;
    const maxConsecutive = Number(r["Max Consecutive"]) || 3;

    const course = courseByName.get(courseName.toLowerCase());
    if (!course) { batchReport.warnings.push(`Row ${rowNum}: course "${courseName}" not found — skipped`); continue; }
    if (!batchName) { batchReport.warnings.push(`Row ${rowNum}: missing Batch Name — skipped`); continue; }

    let batchRow = batchByCode.get(batchCode.toLowerCase());
    if (batchRow) {
      await db.update(batches).set({
        name: batchName, courseId: course.id, studentCount, maxClassesPerDay: maxPerDay, maxConsecutiveClasses: maxConsecutive, updatedAt: new Date().toISOString()
      }).where(eq(batches.id, batchRow.id));
      batchReport.updated++;
    } else {
      const [newRow] = await db.insert(batches).values({
        organizationId: orgId, courseId: course.id, academicSessionId: activeSession.id,
        name: batchName, code: batchCode, studentCount, maxClassesPerDay: maxPerDay, maxConsecutiveClasses: maxConsecutive
      }).returning();
      batchRow = newRow;
      batchByCode.set(batchCode.toLowerCase(), newRow);
      batchReport.created++;
      for (let d = 0; d <= 6; d++) {
        await db.insert(batchAvailability).values({ batchId: newRow.id, dayOfWeek: d, available: d !== 0, startTime: d !== 0 ? "07:00" : null, endTime: d !== 0 ? "17:00" : null });
      }
    }

    // Subject Requirements: "Physics:5, Chemistry:5"
    const reqStr = String(r["Subject Requirements"] || "").trim();
    if (reqStr) {
      const pairs = reqStr.split(",").map((p) => p.trim()).filter(Boolean);
      for (const pair of pairs) {
        const [subjName, countStr] = pair.split(":").map((s) => s.trim());
        const subj = subjectByName.get((subjName || "").toLowerCase());
        const count = Number(countStr);
        if (!subj || !count) { batchReport.warnings.push(`Row ${rowNum}: could not parse requirement "${pair}"`); continue; }
        const existingReq = await db.query.batchSubjectRequirements.findFirst({
          where: and(eq(batchSubjectRequirements.batchId, batchRow.id), eq(batchSubjectRequirements.subjectId, subj.id))
        });
        if (existingReq) {
          await db.update(batchSubjectRequirements).set({ classesPerWeek: count }).where(eq(batchSubjectRequirements.id, existingReq.id));
        } else {
          await db.insert(batchSubjectRequirements).values({ batchId: batchRow.id, subjectId: subj.id, classesPerWeek: count, minGapDays: 0 });
        }
      }
    }
  }
  reports.push(batchReport);

  // ---------- Faculty (+ subject/batch links) ----------
  const facultyRows = sheetRows(wb, "Faculty");
  const facultyReport: SectionReport = { section: "Faculty", processed: facultyRows.length, created: 0, updated: 0, warnings: [] };
  const currentBatches = await db.query.batches.findMany({ where: eq(batches.organizationId, orgId) });
  const batchByName = new Map(currentBatches.map((b) => [b.name.toLowerCase(), b]));
  const currentSubjects = await db.query.subjects.findMany({ where: eq(subjects.organizationId, orgId) });
  const subjByNameForFaculty = new Map(currentSubjects.map((s) => [s.name.toLowerCase(), s]));
  const existingFaculty = await db.query.faculty.findMany({ where: eq(faculty.organizationId, orgId) });
  const facultyByEmpId = new Map(existingFaculty.map((f) => [f.employeeId.toLowerCase(), f]));

  for (let i = 0; i < facultyRows.length; i++) {
    const r = facultyRows[i];
    const rowNum = i + 2;
    const name = String(r["Name"] || "").trim();
    const employeeId = String(r["Employee ID"] || "").trim();
    if (!name || !employeeId) { facultyReport.warnings.push(`Row ${rowNum}: missing Name/Employee ID`); continue; }

    const subjectNames = String(r["Subjects"] || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const batchNames = String(r["Batches"] || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const email = String(r["Email"] || "").trim() || null;
    const phone = String(r["Phone"] || "").trim() || null;
    const maxPerDay = Number(r["Max Per Day"]) || 6;
    const maxPerWeek = Number(r["Max Per Week"]) || 30;

    let facultyRow = facultyByEmpId.get(employeeId.toLowerCase());
    if (facultyRow) {
      await db.update(faculty).set({ name, email, phone, maxClassesPerDay: maxPerDay, maxClassesPerWeek: maxPerWeek, updatedAt: new Date().toISOString() }).where(eq(faculty.id, facultyRow.id));
      facultyReport.updated++;
    } else {
      const [newRow] = await db.insert(faculty).values({
        organizationId: orgId, name, employeeId, email, phone, maxClassesPerDay: maxPerDay, maxClassesPerWeek: maxPerWeek, status: "ACTIVE"
      }).returning();
      facultyRow = newRow;
      facultyByEmpId.set(employeeId.toLowerCase(), newRow);
      facultyReport.created++;
      for (let d = 0; d <= 6; d++) {
        await db.insert(facultyAvailability).values({ facultyId: newRow.id, dayOfWeek: d, available: d !== 0, startTime: d !== 0 ? "07:00" : null, endTime: d !== 0 ? "17:00" : null });
      }
    }

    for (const sName of subjectNames) {
      const subj = subjByNameForFaculty.get(sName.toLowerCase());
      if (!subj) { facultyReport.warnings.push(`Row ${rowNum}: subject "${sName}" not found`); continue; }
      const link = await db.query.facultySubjects.findFirst({ where: and(eq(facultySubjects.facultyId, facultyRow.id), eq(facultySubjects.subjectId, subj.id)) });
      if (!link) await db.insert(facultySubjects).values({ facultyId: facultyRow.id, subjectId: subj.id }).onConflictDoNothing();
    }
    for (const bName of batchNames) {
      const batch = batchByName.get(bName.toLowerCase());
      if (!batch) { facultyReport.warnings.push(`Row ${rowNum}: batch "${bName}" not found`); continue; }
      const link = await db.query.facultyBatches.findFirst({ where: and(eq(facultyBatches.facultyId, facultyRow.id), eq(facultyBatches.batchId, batch.id)) });
      if (!link) await db.insert(facultyBatches).values({ facultyId: facultyRow.id, batchId: batch.id }).onConflictDoNothing();
    }
  }
  reports.push(facultyReport);

  await db.insert(auditLogs).values({
    organizationId: orgId, userId: userId, action: "BULK_IMPORT",
    metadata: JSON.stringify({ reports: reports.map((r) => ({ section: r.section, created: r.created, updated: r.updated, warnings: r.warnings.length })) })
  });

  // ---------- Auto-generate a draft timetable for the next working week ----------
  const weekStartDate = nextMonday();
  const schedulerInput = await buildSchedulerInput({ organizationId: orgId, academicSessionId: activeSession.id, weekStartDate });

  let generation: { timetableId: string; qualityScore: number; requiredTotal: number; scheduledTotal: number; weekStartDate: string } | null = null;
  let generationSkippedReason: string | null = null;

  if (schedulerInput.requirements.length === 0) {
    generationSkippedReason = "No batch subject requirements found (fill the 'Subject Requirements' column on the Batches sheet) — nothing to schedule yet.";
  } else if (schedulerInput.dateSlots.length === 0) {
    generationSkippedReason = "No CLASS-type time slots configured — add rows to the TimeSlots sheet first.";
  } else {
    const attempts = generateMultipleAttempts(schedulerInput, 3);
    const best = attempts[0];
    const [tt] = await db.insert(timetables).values({
      organizationId: orgId, academicSessionId: activeSession.id, weekStartDate, status: "DRAFT",
      qualityScore: best.qualityScore,
      generationMeta: JSON.stringify({ requiredTotal: best.requiredTotal, scheduledTotal: best.scheduledTotal, unscheduled: best.unscheduled, warnings: best.warnings })
    }).returning();
    if (best.entries.length > 0) {
      await db.insert(timetableEntries).values(best.entries.map((e) => ({ timetableId: tt.id, classType: "REGULAR", ...e })));
    }
    generation = { timetableId: tt.id, qualityScore: best.qualityScore, requiredTotal: best.requiredTotal, scheduledTotal: best.scheduledTotal, weekStartDate };
  }

  return { reports, generation, generationSkippedReason };
}
