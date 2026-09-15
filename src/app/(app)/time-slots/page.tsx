import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timeSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createTimeSlot } from "./actions";
import TimeSlotRow from "./time-slot-row";

export default async function TimeSlotsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, user.organizationId), orderBy: (t, { asc }) => asc(t.sortOrder) });
  const nextSortOrder = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Time Slots</h1>
      <div className="card p-5">
        <form action={createTimeSlot} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><label className="label">Start</label><input name="startTime" type="time" required className="input" /></div>
          <div><label className="label">End</label><input name="endTime" type="time" required className="input" /></div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input" defaultValue="CLASS">
              <option value="CLASS">CLASS</option>
              <option value="BREAK">BREAK</option>
            </select>
          </div>
          <input type="hidden" name="sortOrder" value={nextSortOrder} />
          <button className="btn-primary">Add Slot</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2">Type</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {rows.map((s) => <TimeSlotRow key={s.id} slot={{ id: s.id, startTime: s.startTime, endTime: s.endTime, type: s.type as "CLASS" | "BREAK" }} />)}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No time slots yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
