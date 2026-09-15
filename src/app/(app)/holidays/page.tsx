import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createHoliday } from "./actions";

export default async function HolidaysPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.holidays.findMany({ where: eq(holidays.organizationId, user.organizationId) });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Holidays</h1>
      <div className="card p-5">
        <form action={createHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="date" type="date" required className="input" />
          <input name="name" required placeholder="e.g. Gandhi Jayanti" className="input" />
          <button className="btn-primary">Add Holiday</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Name</th></tr></thead>
          <tbody>{rows.map((h) => (
            <tr key={h.id} className="border-t border-slate-100"><td className="px-4 py-2">{h.date}</td><td className="px-4 py-2">{h.name}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
