import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { courses, batches, faculty, rooms, timetables, timetableEntries } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const orgId = user.organizationId;

  const [courseRows, batchRows, facultyRows, roomRows, timetableRows] = await Promise.all([
    db.query.courses.findMany({ where: eq(courses.organizationId, orgId) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, orgId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, orgId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, orgId) }),
    db.query.timetables.findMany({ where: eq(timetables.organizationId, orgId) })
  ]);

  const published = timetableRows.filter((t) => t.status === "PUBLISHED");
  const publishedIds = published.map((t) => t.id);

  const entries = publishedIds.length
    ? await db.query.timetableEntries.findMany({ where: inArray(timetableEntries.timetableId, publishedIds) })
    : [];

  const batchById = new Map(batchRows.map((b) => [b.id, b]));
  const facultyById = new Map(facultyRows.map((f) => [f.id, f]));

  const lecturesByBatch = new Map<string, number>();
  const lecturesByFaculty = new Map<string, number>();
  for (const e of entries) {
    lecturesByBatch.set(e.batchId, (lecturesByBatch.get(e.batchId) || 0) + 1);
    lecturesByFaculty.set(e.facultyId, (lecturesByFaculty.get(e.facultyId) || 0) + 1);
  }

  const batchReport = Array.from(lecturesByBatch.entries())
    .map(([batchId, count]) => ({ name: batchById.get(batchId)?.name || "Unknown batch", count }))
    .sort((a, b) => b.count - a.count);

  const facultyReport = Array.from(lecturesByFaculty.entries())
    .map(([facultyId, count]) => ({ name: facultyById.get(facultyId)?.name || "Unknown faculty", count }))
    .sort((a, b) => b.count - a.count);

  const cards = [
    { label: "Total Courses", value: courseRows.length },
    { label: "Total Batches", value: batchRows.length },
    { label: "Total Faculty", value: facultyRows.length },
    { label: "Total Rooms", value: roomRows.length },
    { label: "Timetables (all)", value: timetableRows.length },
    { label: "Published Timetables", value: published.length }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
          <p className="text-sm text-slate-500">{user.organization?.name}</p>
        </div>
        <Link href="/timetable/generate" className="btn-primary">Generate Timetable</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className="text-2xl font-semibold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {courseRows.length === 0 && (
        <div className="card p-5 text-sm">
          No master data yet. Run <code className="bg-slate-100 px-1 rounded">npm run db:seed</code> to load demo
          data for S-CUBUS, or start adding Courses, Batches, Faculty and Rooms from the sidebar.
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-1">Cumulative Lecture Report</h2>
        <p className="text-sm text-slate-500 mb-3">
          Total lectures scheduled across all published timetables ({published.length} published week{published.length === 1 ? "" : "s"}).
        </p>
        {entries.length === 0 ? (
          <div className="card p-5 text-sm text-slate-400">
            No published timetables yet — publish a generated timetable to start accumulating this report.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 font-medium text-sm text-slate-600">Lectures by Batch</div>
              <table className="w-full text-sm">
                <tbody>
                  {batchReport.map((r) => (
                    <tr key={r.name} className="border-t border-slate-100">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 font-medium text-sm text-slate-600">Lectures by Faculty</div>
              <table className="w-full text-sm">
                <tbody>
                  {facultyReport.map((r) => (
                    <tr key={r.name} className="border-t border-slate-100">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
