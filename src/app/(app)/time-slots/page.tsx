import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timeSlots } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function TimeSlotsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, user.organizationId), orderBy: (t, { asc }) => asc(t.sortOrder) });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Time Slots</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2">Type</th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="px-4 py-2">{s.startTime}</td><td className="px-4 py-2">{s.endTime}</td>
              <td className="px-4 py-2">{s.type === "BREAK" ? <span className="text-amber-600">BREAK</span> : "CLASS"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
