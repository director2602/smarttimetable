import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables, timetableEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { validateSchedule } from "@/scheduler/validator";
import { buildSchedulerInput } from "@/scheduler/build-input";

export default async function ConflictsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const latest = await db.query.timetables.findFirst({
    where: eq(timetables.organizationId, user.organizationId),
    orderBy: [desc(timetables.createdAt)]
  });

  if (!latest) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Conflicts</h1>
        <p className="text-slate-500 text-sm">No timetable generated yet.</p>
      </div>
    );
  }

  const entries = await db.query.timetableEntries.findMany({ where: eq(timetableEntries.timetableId, latest.id) });
  const schedulerInput = await buildSchedulerInput({
    organizationId: user.organizationId,
    academicSessionId: latest.academicSessionId,
    weekStartDate: latest.weekStartDate
  });
  const conflicts = validateSchedule(
    entries.map((e) => ({ ...e })),
    schedulerInput
  );

  const meta = latest.generationMeta ? JSON.parse(latest.generationMeta) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Conflicts — Week of {latest.weekStartDate}</h1>

      <div className="card p-5">
        <div className="font-medium mb-2">Hard Conflicts ({conflicts.length})</div>
        {conflicts.length === 0 ? (
          <p className="text-sm text-green-700">No hard conflicts in the current timetable.</p>
        ) : (
          <ul className="space-y-2">
            {conflicts.map((c, i) => (
              <li key={i} className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium">{c.type}</span> — {c.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {meta?.unscheduled?.length > 0 && (
        <div className="card p-5">
          <div className="font-medium mb-2">Unscheduled Requirements ({meta.unscheduled.length})</div>
          <ul className="space-y-2">
            {meta.unscheduled.map((u: any, i: number) => (
              <li key={i} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                <div className="font-medium">{u.batchName} — {u.subjectName} ({u.scheduled}/{u.required})</div>
                <ul className="list-disc list-inside text-slate-600 mt-1">{u.reasons.map((r: string, ri: number) => <li key={ri}>{r}</li>)}</ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
