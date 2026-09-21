import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries, batches, subjects, faculty, rooms, timeSlots, lectures } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import PublishButton from "./publish-button";
import DeleteTimetableButton from "../delete-timetable-button";
import ManualEntryForm from "./manual-entry-form";
import DeleteEntryButton from "./delete-entry-button";

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

  const lectureIds = Array.from(new Set(entries.map((e) => e.lectureId).filter((x): x is string => !!x)));
  const lectureRows = lectureIds.length ? await db.query.lectures.findMany({ where: inArray(lectures.id, lectureIds) }) : [];
  const lectureById = new Map(lectureRows.map((l) => [l.id, l]));

  const batchById = new Map(batchRows.map((b) => [b.id, b]));
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const facultyById = new Map(facultyRows.map((f) => [f.id, f]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  // Grid rows = every configured CLASS/DOUBTS slot, PLUS any entry time that doesn't match
  // a configured slot (e.g. a manually-added one-off class at a custom time) — so nothing
  // placed on this timetable is ever silently invisible in the grid.
  const configuredSlotTimes = new Set(slotRows.filter((s) => s.type === "CLASS" || s.type === "DOUBTS").map((s) => s.startTime));
  const extraTimes = Array.from(new Set(entries.map((e) => e.startTime).filter((t) => !configuredSlotTimes.has(t))))
    .map((t) => {
      const entry = entries.find((e) => e.startTime === t)!;
      return { id: `extra-${t}`, startTime: t, endTime: entry.endTime, type: "CLASS" as const };
    });
  const gridSlots = [
    ...slotRows.filter((s) => s.type === "CLASS" || s.type === "DOUBTS"),
    ...extraTimes
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

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

      {tt.status !== "PUBLISHED" && (
        <ManualEntryForm
          timetableId={tt.id}
          batches={batchRows.map((b) => ({ id: b.id, name: b.name }))}
          rooms={roomRows.map((r) => ({ id: r.id, name: r.name }))}
          subjects={subjectRows.map((s) => ({ id: s.id, name: s.name }))}
          faculty={facultyRows.map((f) => ({ id: f.id, name: f.name }))}
        />
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
            {gridSlots.map((slot) => (
              <tr key={slot.id}>
                <td className="border border-slate-200 px-2 py-2 font-medium text-slate-500 whitespace-nowrap">
                  {slot.startTime}–{slot.endTime}
                  {slot.type === "DOUBTS" && <div className="text-[10px] text-amber-600">DOUBTS</div>}
                </td>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const cellEntries = byDaySlot.get(`${d}:${slot.startTime}`) || [];
                  return (
                    <td key={d} className="border border-slate-200 px-1 py-1 align-top min-w-[130px]">
                      <div className="space-y-1">
                        {cellEntries.map((e) => {
                          const canDelete = tt.status !== "PUBLISHED";
                          if (e.classType === "DOUBTS") {
                            return (
                              <div key={e.id} className="bg-amber-50 border border-amber-100 rounded px-2 py-1 relative group">
                                <div className="font-semibold text-amber-700">DOUBTS</div>
                                <div className="text-slate-500">{roomById.get(e.roomId)?.name}</div>
                                <div className="text-slate-500">{batchById.get(e.batchId)?.name}</div>
                                {canDelete && <DeleteEntryButton entryId={e.id} timetableId={tt.id} />}
                              </div>
                            );
                          }
                          if (e.classType === "OTHER") {
                            return (
                              <div key={e.id} className="bg-slate-100 border border-slate-200 rounded px-2 py-1 relative group">
                                <div className="font-semibold text-slate-700">{e.notes || "Other"}</div>
                                <div className="text-slate-500">{roomById.get(e.roomId)?.name}</div>
                                <div className="text-slate-500">{batchById.get(e.batchId)?.name}</div>
                                {canDelete && <DeleteEntryButton entryId={e.id} timetableId={tt.id} />}
                              </div>
                            );
                          }
                          const lecture = e.lectureId ? lectureById.get(e.lectureId) : null;
                          return (
                            <div key={e.id} className="bg-brand-50 border border-brand-100 rounded px-2 py-1 relative group">
                              <div className="font-semibold text-brand-700">
                                {lecture ? lecture.code : (e.subjectId ? subjById.get(e.subjectId)?.name : "")}
                              </div>
                              {lecture && <div className="text-[10px] text-slate-500">{lecture.name}</div>}
                              <div className="text-slate-600">{e.facultyId ? facultyById.get(e.facultyId)?.name : ""}</div>
                              <div className="text-slate-500">{roomById.get(e.roomId)?.name}</div>
                              <div className="text-slate-500">{batchById.get(e.batchId)?.name}</div>
                              {canDelete && <DeleteEntryButton entryId={e.id} timetableId={tt.id} />}
                            </div>
                          );
                        })}
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
