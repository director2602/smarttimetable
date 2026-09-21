import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, courses, subjects, faculty, rooms, instituteSettings, lectures } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image as PdfImage } from "@react-pdf/renderer";
import React from "react";
import path from "path";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: { padding: 20, fontSize: 8, fontFamily: "Helvetica" },
  logoWrap: { alignItems: "center", marginBottom: 4 },
  logo: { width: 90, height: 103 },
  bar: { borderWidth: 1, borderColor: "#333", paddingVertical: 4, alignItems: "center", marginBottom: -1 },
  barTitle: { fontSize: 12, fontWeight: 700 },
  streamBar: { backgroundColor: "#400C4D", paddingVertical: 4, alignItems: "center", borderWidth: 1, borderColor: "#333", marginBottom: -1 },
  streamBarText: { color: "#fff", fontSize: 11, fontWeight: 700 },
  table: { borderWidth: 1, borderColor: "#333", marginBottom: 14 },
  headerRow: { flexDirection: "row", backgroundColor: "#e5e5e5", borderBottomWidth: 1, borderBottomColor: "#333" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#999" },
  sectionCell: { width: 70, borderRightWidth: 1, borderRightColor: "#333", padding: 3, fontWeight: 700, backgroundColor: "#f2eef3" },
  headerSectionCell: { width: 70, borderRightWidth: 1, borderRightColor: "#333", padding: 3, fontWeight: 700 },
  timeCell: { flex: 1, borderRightWidth: 1, borderRightColor: "#333", padding: 3, textAlign: "center" },
  headerTimeCell: { flex: 1, borderRightWidth: 1, borderRightColor: "#333", padding: 3, textAlign: "center", fontWeight: 700 },
  roomCell: { width: 44, padding: 3, textAlign: "center" },
  headerRoomCell: { width: 44, padding: 3, textAlign: "center", fontWeight: 700 },
  footer: { position: "absolute", bottom: 14, left: 20, right: 20, fontSize: 7, color: "#888", flexDirection: "row", justifyContent: "space-between" }
});

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime12(t: string) {
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr}${suffix}`;
}

// Institute-specific grouping of courses into the two "streams" used on the
// physical timetable sheet. Adjust here if the course naming convention changes.
function streamForCourse(courseName: string): "MEDICAL | ENGINEERING" | "FOUNDATION" {
  const n = courseName.toUpperCase();
  if (n.includes("JEE") || n.includes("NEET")) return "MEDICAL | ENGINEERING";
  return "FOUNDATION";
}

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

  const courseById = new Map(courseRows.map((c) => [c.id, c]));
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  const lectureIds = Array.from(new Set(entries.map((e) => e.lectureId).filter((x): x is string => !!x)));
  const lectureRows = lectureIds.length ? await db.query.lectures.findMany({ where: inArray(lectures.id, lectureIds) }) : [];
  const lectureById = new Map(lectureRows.map((l) => [l.id, l]));

  const streamOfBatch = new Map<string, string>();
  for (const b of batchRows) {
    const course = courseById.get(b.courseId);
    streamOfBatch.set(b.id, course ? streamForCourse(course.name) : "FOUNDATION");
  }

  const dates = Array.from(new Set(entries.map((e) => e.date))).sort();
  const STREAM_ORDER = ["MEDICAL | ENGINEERING", "FOUNDATION"];

  const pages = dates.map((date) => {
    const dayEntries = entries.filter((e) => e.date === date);
    const dayLabel = format(new Date(date), "EEEE, d MMMM, yyyy");

    const streamBlocks = STREAM_ORDER.map((streamName) => {
      const streamBatchIds = new Set(batchRows.filter((b) => streamOfBatch.get(b.id) === streamName).map((b) => b.id));
      const streamEntries = dayEntries.filter((e) => streamBatchIds.has(e.batchId));
      if (streamEntries.length === 0) return null;

      // Dynamic columns: every distinct time slot actually used by this stream today
      const columnMap = new Map<string, { startTime: string; endTime: string }>();
      for (const e of streamEntries) columnMap.set(e.startTime, { startTime: e.startTime, endTime: e.endTime });
      const columns = Array.from(columnMap.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));

      const streamBatches = batchRows
        .filter((b) => streamBatchIds.has(b.id))
        .sort((a, b) => a.name.localeCompare(b.name));

      return React.createElement(
        View,
        { key: streamName, wrap: false },
        React.createElement(View, { style: styles.streamBar }, React.createElement(Text, { style: styles.streamBarText }, streamName)),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: styles.headerRow },
            React.createElement(Text, { style: styles.headerSectionCell }, "SECTION"),
            ...columns.map((c) => React.createElement(Text, { key: c.startTime, style: styles.headerTimeCell }, `${formatTime12(c.startTime)}-${formatTime12(c.endTime)}`)),
            React.createElement(Text, { style: styles.headerRoomCell }, "ROOM NO.")
          ),
          ...streamBatches.map((b) => {
            const batchEntries = streamEntries.filter((e) => e.batchId === b.id);
            const roomCounts = new Map<string, number>();
            for (const e of batchEntries) roomCounts.set(e.roomId, (roomCounts.get(e.roomId) || 0) + 1);
            const topRoomId = Array.from(roomCounts.entries()).sort((a, b2) => b2[1] - a[1])[0]?.[0];
            const roomLabel = topRoomId ? roomById.get(topRoomId)?.name || "" : "";

            return React.createElement(
              View,
              { key: b.id, style: styles.row },
              React.createElement(Text, { style: styles.sectionCell }, b.name),
              ...columns.map((c) => {
                const match = batchEntries.find((e) => e.startTime === c.startTime);
                let label = "";
                if (match) {
                  if (match.classType === "DOUBTS") {
                    label = "DOUBTS";
                  } else if (match.classType === "OTHER") {
                    label = match.notes || "";
                  } else {
                    const lecture = match.lectureId ? lectureById.get(match.lectureId) : null;
                    label = lecture ? lecture.code : (match.subjectId ? (subjById.get(match.subjectId)?.code || subjById.get(match.subjectId)?.name || "") : "");
                  }
                }
                return React.createElement(Text, { key: c.startTime, style: styles.timeCell }, label);
              }),
              React.createElement(Text, { style: styles.roomCell }, roomLabel)
            );
          })
        )
      );
    }).filter(Boolean);

    if (streamBlocks.length === 0) return null;

    return React.createElement(
      Page,
      { key: date, size: "A4", style: styles.page, wrap: true },
      React.createElement(View, { style: styles.logoWrap }, React.createElement(PdfImage, { src: path.join(process.cwd(), "public", "logo.png"), style: styles.logo })),
      React.createElement(View, { style: styles.bar }, React.createElement(Text, { style: styles.barTitle }, "Timetable")),
      React.createElement(View, { style: styles.bar }, React.createElement(Text, { style: styles.barTitle }, dayLabel)),
      React.createElement(View, { style: { marginTop: 10 } }, ...streamBlocks),
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { render: ({ pageNumber, totalPages }: any) => `Page ${pageNumber} of ${totalPages}` }),
        React.createElement(Text, {}, `Generated ${new Date().toLocaleString()}`)
      )
    );
  }).filter(Boolean);

  if (pages.length === 0) {
    pages.push(
      React.createElement(
        Page,
        { key: "empty", size: "A4", style: styles.page },
        React.createElement(View, { style: styles.logoWrap }, React.createElement(PdfImage, { src: path.join(process.cwd(), "public", "logo.png"), style: styles.logo })),
        React.createElement(Text, {}, "No classes scheduled in this timetable yet.")
      )
    );
  }

  const doc = React.createElement(Document, {}, ...pages);
  const buffer = await renderToBuffer(doc as any);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="timetable-${tt.weekStartDate}.pdf"`
    }
  });
}
