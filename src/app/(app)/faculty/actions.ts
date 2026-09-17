"use server";
import { requirePermission } from "@/lib/auth";
import { db } from "@/db";
import { faculty, facultyAvailability, facultyBatches, facultySubjects, facultyBlockedSlots, subjects, batches, timetableEntries, auditLogs } from "@/db/schema";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export async function deleteFaculty(id: string) {
  const user = await requirePermission("FACULTY_DELETE");
  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, id) });
  if (!existing || existing.organizationId !== user.organizationId) return { error: "Faculty not found" };

  const usedEntries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.facultyId, id) });
  if (usedEntries.length > 0) {
    return { error: `Cannot delete — ${existing.name} appears in ${usedEntries.length} scheduled class(es) across one or more timetables. Set them to Inactive instead, or remove those classes first.` };
  }

  await db.delete(facultySubjects).where(eq(facultySubjects.facultyId, id));
  await db.delete(facultyBatches).where(eq(facultyBatches.facultyId, id));
  await db.delete(facultyAvailability).where(eq(facultyAvailability.facultyId, id));
  await db.delete(facultyBlockedSlots).where(eq(facultyBlockedSlots.facultyId, id));
  await db.delete(faculty).where(and(eq(faculty.id, id), eq(faculty.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "FACULTY_DELETED", entityType: "faculty", entityId: id, metadata: JSON.stringify({ name: existing.name }) });
  revalidatePath("/faculty");
  return { success: true };
}

export async function editFaculty(formData: FormData) {
  const user = await requirePermission("FACULTY_EDIT");
  const schema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    employeeId: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    maxClassesPerDay: z.coerce.number().int().min(1),
    maxClassesPerWeek: z.coerce.number().int().min(1),
    status: z.enum(["ACTIVE", "INACTIVE"])
  });
  const parsed = schema.parse({
    id: formData.get("id"),
    name: formData.get("name"),
    employeeId: formData.get("employeeId"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    maxClassesPerDay: formData.get("maxClassesPerDay"),
    maxClassesPerWeek: formData.get("maxClassesPerWeek"),
    status: formData.get("status")
  });

  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, parsed.id) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Faculty not found");

  await db.update(faculty).set({
    name: parsed.name,
    employeeId: parsed.employeeId,
    email: parsed.email || null,
    phone: parsed.phone || null,
    maxClassesPerDay: parsed.maxClassesPerDay,
    maxClassesPerWeek: parsed.maxClassesPerWeek,
    status: parsed.status,
    updatedAt: new Date().toISOString()
  }).where(and(eq(faculty.id, parsed.id), eq(faculty.organizationId, user.organizationId)));

  await db.insert(auditLogs).values({ organizationId: user.organizationId, userId: user.id, action: "FACULTY_EDITED", entityType: "faculty", entityId: parsed.id });
  revalidatePath("/faculty");
}

export async function importFacultyFromExcel(formData: FormData) {
  const user = await requirePermission("FACULTY_CREATE");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file uploaded");

  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The uploaded file has no sheets");
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

  if (rows.length === 0) throw new Error("No data rows found in the sheet");

  const [orgSubjects, orgBatches, orgFaculty] = await Promise.all([
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) })
  ]);
  const subjectByKey = new Map(orgSubjects.map((s) => [s.name.toLowerCase(), s]));
  for (const s of orgSubjects) subjectByKey.set(s.code.toLowerCase(), s);
  const batchByKey = new Map(orgBatches.map((b) => [b.name.toLowerCase(), b]));
  const facultyByEmpId = new Map(orgFaculty.map((f) => [f.employeeId.toLowerCase(), f]));

  let created = 0;
  let updated = 0;
  const warnings: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // account for header row
    const name = String(r["Name"] || "").trim();
    const employeeId = String(r["Employee ID"] || "").trim();
    if (!name || !employeeId) {
      warnings.push(`Row ${rowNum}: missing Name or Employee ID — skipped`);
      continue;
    }

    const subjectNames = String(r["Subjects"] || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const batchNames = String(r["Batches"] || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const email = String(r["Email"] || "").trim() || null;
    const phone = String(r["Phone"] || "").trim() || null;
    const maxPerDay = Number(r["Max Per Day"]) || 6;
    const maxPerWeek = Number(r["Max Per Week"]) || 30;

    let facultyRow = facultyByEmpId.get(employeeId.toLowerCase());
    if (facultyRow) {
      await db.update(faculty).set({
        name, email, phone, maxClassesPerDay: maxPerDay, maxClassesPerWeek: maxPerWeek, updatedAt: new Date().toISOString()
      }).where(eq(faculty.id, facultyRow.id));
      updated++;
    } else {
      const [newRow] = await db.insert(faculty).values({
        organizationId: user.organizationId, name, employeeId, email, phone,
        maxClassesPerDay: maxPerDay, maxClassesPerWeek: maxPerWeek, status: "ACTIVE"
      }).returning();
      facultyRow = newRow;
      facultyByEmpId.set(employeeId.toLowerCase(), newRow);
      created++;
      // Default availability: Mon-Sat working, Sunday off
      for (let d = 0; d <= 6; d++) {
        await db.insert(facultyAvailability).values({
          facultyId: newRow.id, dayOfWeek: d, available: d !== 0,
          startTime: d !== 0 ? "07:00" : null, endTime: d !== 0 ? "17:00" : null
        });
      }
    }

    // Subjects: link every matched subject; report unmatched names
    for (const sName of subjectNames) {
      const subj = subjectByKey.get(sName.toLowerCase());
      if (!subj) { warnings.push(`Row ${rowNum}: subject "${sName}" not found — create it under Subjects first`); continue; }
      const existingLink = await db.query.facultySubjects.findFirst({
        where: and(eq(facultySubjects.facultyId, facultyRow.id), eq(facultySubjects.subjectId, subj.id))
      });
      if (!existingLink) await db.insert(facultySubjects).values({ facultyId: facultyRow.id, subjectId: subj.id }).onConflictDoNothing();
    }

    // Batches: link every matched batch; report unmatched names
    for (const bName of batchNames) {
      const batch = batchByKey.get(bName.toLowerCase());
      if (!batch) { warnings.push(`Row ${rowNum}: batch "${bName}" not found — create it under Batches first`); continue; }
      const existingLink = await db.query.facultyBatches.findFirst({
        where: and(eq(facultyBatches.facultyId, facultyRow.id), eq(facultyBatches.batchId, batch.id))
      });
      if (!existingLink) await db.insert(facultyBatches).values({ facultyId: facultyRow.id, batchId: batch.id }).onConflictDoNothing();
    }
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId, userId: user.id, action: "FACULTY_IMPORTED",
    metadata: JSON.stringify({ rows: rows.length, created, updated, warnings: warnings.length })
  });

  revalidatePath("/faculty");
  return { rowsProcessed: rows.length, created, updated, warnings };
}

export async function updateFacultyBatches(facultyId: string, batchIds: string[]) {
  const user = await requirePermission("FACULTY_EDIT");

  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, facultyId) });
  if (!existing || existing.organizationId !== user.organizationId) throw new Error("Faculty not found");

  // Validate every batch belongs to this org before assigning
  if (batchIds.length > 0) {
    const validBatches = await db.query.batches.findMany({
      where: and(eq(batches.organizationId, user.organizationId), inArray(batches.id, batchIds))
    });
    if (validBatches.length !== batchIds.length) throw new Error("One or more batches not found");
  }

  await db.delete(facultyBatches).where(eq(facultyBatches.facultyId, facultyId));
  if (batchIds.length > 0) {
    await db.insert(facultyBatches).values(batchIds.map((batchId) => ({ facultyId, batchId })));
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "FACULTY_BATCHES_UPDATED",
    entityType: "faculty",
    entityId: facultyId,
    metadata: JSON.stringify({ batchIds })
  });

  revalidatePath("/faculty");
}

export async function updateFacultyAvailability(facultyId: string, days: { dayOfWeek: number; available: boolean }[]) {
  const user = await requirePermission("FACULTY_EDIT");

  const existing = await db.query.faculty.findFirst({ where: eq(faculty.id, facultyId) });
  if (!existing || existing.organizationId !== user.organizationId) {
    throw new Error("Faculty not found");
  }

  for (const d of days) {
    const row = await db.query.facultyAvailability.findFirst({
      where: and(eq(facultyAvailability.facultyId, facultyId), eq(facultyAvailability.dayOfWeek, d.dayOfWeek))
    });
    if (row) {
      await db.update(facultyAvailability).set({ available: d.available }).where(eq(facultyAvailability.id, row.id));
    } else {
      await db.insert(facultyAvailability).values({
        facultyId,
        dayOfWeek: d.dayOfWeek,
        available: d.available,
        startTime: d.available ? "07:00" : null,
        endTime: d.available ? "17:00" : null
      });
    }
  }

  await db.insert(auditLogs).values({
    organizationId: user.organizationId,
    userId: user.id,
    action: "FACULTY_ROSTER_UPDATED",
    entityType: "faculty",
    entityId: facultyId,
    metadata: JSON.stringify({ days })
  });

  revalidatePath("/faculty");
}
