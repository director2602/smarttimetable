import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { courses, batches, faculty, rooms, timetables } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const orgId = user.organizationId;

  const [courseCount, batchCount, facultyCount, roomCount, timetableRows] = await Promise.all([
    db.query.courses.findMany({ where: eq(courses.organizationId, orgId) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, orgId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, orgId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, orgId) }),
    db.query.timetables.findMany({ where: eq(timetables.organizationId, orgId) })
  ]);

  const published = timetableRows.filter((t) => t.status === "PUBLISHED").length;

  const cards = [
    { label: "Total Courses", value: courseCount.length },
    { label: "Total Batches", value: batchCount.length },
    { label: "Total Faculty", value: facultyCount.length },
    { label: "Total Rooms", value: roomCount.length },
    { label: "Timetables (all)", value: timetableRows.length },
    { label: "Published Timetables", value: published }
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

      {courseCount.length === 0 && (
        <div className="card p-5 text-sm">
          No master data yet. Run <code className="bg-slate-100 px-1 rounded">npm run db:seed</code> to load demo
          data for S-CUBUS, or start adding Courses, Batches, Faculty and Rooms from the sidebar.
        </div>
      )}
    </div>
  );
}
