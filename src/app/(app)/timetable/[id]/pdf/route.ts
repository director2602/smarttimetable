import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, courses, subjects, faculty, rooms, instituteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image as PdfImage } from "@react-pdf/renderer";
import React from "react";
import path from "path";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555", marginBottom: 10 },
  courseHeading: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 4, color: "#155166" },
  batchHeading: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 2 },
  cellTime: { width: "16%" },
  cellDay: { width: "12%" },
  cellSubject: { width: "24%" },
  cellFaculty: { width: "24%" },
  cellRoom: { width: "24%" },
  headerRow: { flexDirection: "row", backgroundColor: "#eef6f8", paddingVertical: 3, fontWeight: 700 },
  logo: { width: 40, height: 46, marginBottom: 6 },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 7, color: "#888", flexDirection: "row", justifyContent: "space-between" }
});

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const tt = await db.query.timetables.findFirst({ where: eq(timetables.id, params.id) });
  if (!tt || tt.organizationId !== user.organizationId) return new NextResponse("Not found", { status: 404 });

  const [entries, batchRows, courseRows, subjectRows, facultyRows, roomRows, settings] = await Promise.all([
    db.query.timetableEntries.findMany({ where: eq(timetableEntries.timetableId, tt.id) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) }),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) }),
    db.query.instituteSettings.findFirst({ where: eq(instituteSettings.organizationId, user.organizationId) })
  ]);

  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const facultyById = new Map(facultyRows.map((f) => [f.id, f]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));
  const entriesByBatch = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!entriesByBatch.has(e.batchId)) entriesByBatch.set(e.batchId, []);
    entriesByBatch.get(e.batchId)!.push(e);
  }

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: styles.page, wrap: true },
      React.createElement(PdfImage, { src: path.join(process.cwd(), "public", "logo.png"), style: styles.logo }),
      React.createElement(Text, { style: styles.title }, settings?.instituteName || "Institute"),
      React.createElement(Text, { style: styles.subtitle }, `Weekly Timetable — Week of ${tt.weekStartDate}`),
      ...courseRows.map((course) => {
        const courseBatches = batchRows.filter((b) => b.courseId === course.id);
        if (courseBatches.length === 0) return null;
        return React.createElement(
          View,
          { key: course.id },
          React.createElement(Text, { style: styles.courseHeading }, course.name),
          ...courseBatches.map((batch) => {
            const rows = (entriesByBatch.get(batch.id) || []).sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
            return React.createElement(
              View,
              { key: batch.id },
              React.createElement(Text, { style: styles.batchHeading }, `${batch.name} (${batch.studentCount} students)`),
              React.createElement(
                View,
                { style: styles.headerRow },
                React.createElement(Text, { style: styles.cellDay }, "Day"),
                React.createElement(Text, { style: styles.cellTime }, "Time"),
                React.createElement(Text, { style: styles.cellSubject }, "Subject"),
                React.createElement(Text, { style: styles.cellFaculty }, "Faculty"),
                React.createElement(Text, { style: styles.cellRoom }, "Room")
              ),
              ...rows.map((e) =>
                React.createElement(
                  View,
                  { key: e.id, style: styles.row },
                  React.createElement(Text, { style: styles.cellDay }, DAY_NAMES[e.dayOfWeek]),
                  React.createElement(Text, { style: styles.cellTime }, `${e.startTime}-${e.endTime}`),
                  React.createElement(Text, { style: styles.cellSubject }, subjById.get(e.subjectId)?.name || ""),
                  React.createElement(Text, { style: styles.cellFaculty }, facultyById.get(e.facultyId)?.name || ""),
                  React.createElement(Text, { style: styles.cellRoom }, roomById.get(e.roomId)?.name || "")
                )
              ),
              rows.length === 0 ? React.createElement(Text, { style: { color: "#999", marginTop: 2 } }, "No classes scheduled.") : null
            );
          })
        );
      }),
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { render: ({ pageNumber, totalPages }: any) => `Page ${pageNumber} of ${totalPages}` }),
        React.createElement(Text, {}, `Generated ${new Date().toLocaleString()}`)
      )
    )
  );

  const buffer = await renderToBuffer(doc as any);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="timetable-${tt.weekStartDate}.pdf"`
    }
  });
}
