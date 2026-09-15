import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { timetables } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export default async function TimetableListPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await db.query.timetables.findMany({
    where: eq(timetables.organizationId, user.organizationId),
    orderBy: [desc(timetables.createdAt)]
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Timetables</h1>
        <Link href="/timetable/generate" className="btn-primary">Generate New</Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Week</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Quality</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{t.weekStartDate}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    t.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                  }`}>{t.status}</span>
                </td>
                <td className="px-4 py-2">v{t.version}</td>
                <td className="px-4 py-2">{t.qualityScore ?? "-"}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/timetable/${t.id}`} className="text-brand-600 hover:underline">View</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No timetables yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
