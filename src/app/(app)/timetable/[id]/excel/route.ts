import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, courses, subjects, faculty, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const tt = await db.query.timetables.findFirst({ where: eq(timetables.id, params.id) });
  if (!tt || tt.organizationId !== user.organizationId) return new NextResponse("Not found", { status: 404 });

  const [entries, batchRows, courseRows, subjectRows, facultyRows, roomRows] = await Promise.all([
    db.query.timetableEntries.findMany({ where: eq(timetableEntries.timetableId, tt.id) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) }),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) })
  ]);

  const batchById = new Map(batchRows.map((b) => [b.id, b]));
  const courseById = new Map(courseRows.map((c) => [c.id, c]));
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const facultyById = new Map(facultyRows.map((f) => [f.id, f]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  const sorted = [...entries].sort((a, b) => (a.date.localeCompare(b.date)) || a.startTime.localeCompare(b.startTime) || (batchById.get(a.batchId)?.name || "").localeCompare(batchById.get(b.batchId)?.name || ""));

  const sheetData = sorted.map((e) => {
    const batch = batchById.get(e.batchId);
    const course = batch ? courseById.get(batch.courseId) : undefined;
    return {
      Date: e.date,
      Day: DAY_NAMES[e.dayOfWeek],
      Course: course?.name || "",
      Batch: batch?.name || "",
      Subject: subjById.get(e.subjectId)?.name || "",
      Faculty: facultyById.get(e.facultyId)?.name || "",
      Room: roomById.get(e.roomId)?.name || "",
      "Start Time": e.startTime,
      "End Time": e.endTime,
      "Class Type": e.classType
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetData);
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
    { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Timetable");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="timetable-${tt.weekStartDate}.xlsx"`
    }
  });
}
