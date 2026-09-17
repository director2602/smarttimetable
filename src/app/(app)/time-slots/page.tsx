import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timeSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import TimeSlotCreateForm from "./time-slot-create-form";
import TimeSlotRow from "./time-slot-row";

export default async function TimeSlotsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, user.organizationId), orderBy: (t, { asc }) => asc(t.sortOrder) });
  const nextSortOrder = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Time Slots</h1>
        <p className="text-sm text-slate-500 mt-1">
          Leave "Days" unchecked for a slot that applies every working day (the usual case). Check one or more
          specific days to give those days their own time structure — e.g. Mon/Wed/Fri only, or a shorter
          Saturday — without changing the slots any other day uses.
        </p>
      </div>
      <TimeSlotCreateForm nextSortOrder={nextSortOrder} />
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Day</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <TimeSlotRow
                key={s.id}
                slot={{
                  id: s.id, startTime: s.startTime, endTime: s.endTime,
                  type: s.type as "CLASS" | "BREAK" | "DOUBTS" | "DAY" | "DATE",
                  daysOfWeek: s.daysOfWeek, sortOrder: s.sortOrder
                }}
              />
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No time slots yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
