import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, subjects, faculty, rooms, timeSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import PublishButton from "./publish-button";
import DeleteTimetableButton from "../delete-timetable-button";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TimetableDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const tt = await db.query.timetables.findFirst({ where: eq(timetables.id, params.id) });
  if (!tt || tt.organizationId !== user.organizationId) return <div>Timetable not found.</div>;

  const [entries, batchRows, subjectRows, facultyRows, roomRows, slotRows] = await Promise.all([
    db.query.timetableEntries.findMany({ where: eq(timetableEntries.timetableId, tt.id) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) }),
    db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, user.organizationId), orderBy: (t, { asc }) => asc(t.sortOrder) })
  ]);

  const batchById = new Map(batchRows.map((b) => [b.id, b]));
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const facultyById = new Map(facultyRows.map((f) => [f.id, f]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));
  const classSlots = slotRows.filter((s) => s.type === "CLASS");

  const byDaySlot = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = `${e.dayOfWeek}:${e.startTime}`;
    if (!byDaySlot.has(key)) byDaySlot.set(key, []);
    byDaySlot.get(key)!.push(e);
  }

  const meta = tt.generationMeta ? JSON.parse(tt.generationMeta) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Week of {tt.weekStartDate}</h1>
          <p className="text-sm text-slate-500">Status: {tt.status} · Version {tt.version} · Quality {tt.qualityScore ?? "-"}/100</p>
        </div>
        <div className="flex gap-2">
          <a href={`/timetable/${tt.id}/pdf`} className="btn-secondary">Download PDF</a>
          <a href={`/timetable/${tt.id}/excel`} className="btn-secondary">Download Excel</a>
          {tt.status !== "PUBLISHED" && <PublishButton timetableId={tt.id} />}
          <DeleteTimetableButton id={tt.id} weekStartDate={tt.weekStartDate} />
        </div>
      </div>

      {meta?.requiredTotal === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          This timetable has no scheduled classes because no batch had any weekly subject requirements configured
          at generation time. Go to <strong>Batches</strong>, add requirements (e.g. Physics × 5/week), then generate again.
        </div>
      )}
      {meta?.warnings?.length > 0 && meta?.requiredTotal > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 space-y-1">
          {meta.warnings.map((w: string, i: number) => <div key={i}>{w}</div>)}
        </div>
      )}
      {meta?.unscheduled?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          {meta.unscheduled.length} requirement(s) could not be fully scheduled. See the generation summary for details.
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="bg-slate-50 border border-slate-200 px-2 py-2 w-24">Time</th>
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <th key={d} className="bg-slate-50 border border-slate-200 px-2 py-2">{DAY_NAMES[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classSlots.map((slot) => (
              <tr key={slot.id}>
                <td className="border border-slate-200 px-2 py-2 font-medium text-slate-500 whitespace-nowrap">
                  {slot.startTime}–{slot.endTime}
                </td>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const cellEntries = byDaySlot.get(`${d}:${slot.startTime}`) || [];
                  return (
                    <td key={d} className="border border-slate-200 px-1 py-1 align-top min-w-[130px]">
                      <div className="space-y-1">
                        {cellEntries.map((e) => (
                          <div key={e.id} className="bg-brand-50 border border-brand-100 rounded px-2 py-1">
                            <div className="font-semibold text-brand-700">{subjById.get(e.subjectId)?.name}</div>
                            <div className="text-slate-600">{facultyById.get(e.facultyId)?.name}</div>
                            <div className="text-slate-500">{roomById.get(e.roomId)?.name}</div>
                            <div className="text-slate-500">{batchById.get(e.batchId)?.name}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
