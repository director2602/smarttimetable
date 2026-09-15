import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { academicSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createAcademicSession } from "./actions";
import SessionRow from "./session-row";

export default async function AcademicSessionsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.academicSessions.findMany({ where: eq(academicSessions.organizationId, user.organizationId) });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Academic Sessions</h1>
      <div className="card p-5">
        <form action={createAcademicSession} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input name="name" required placeholder="e.g. 2027-28" className="input" />
          <input name="startDate" type="date" required className="input" />
          <input name="endDate" type="date" required className="input" />
          <button className="btn-primary">Add Session</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Start</th><th className="px-4 py-2">End</th><th className="px-4 py-2">Active</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>{rows.map((r) => <SessionRow key={r.id} session={r} />)}</tbody>
        </table>
      </div>
    </div>
  );
}
