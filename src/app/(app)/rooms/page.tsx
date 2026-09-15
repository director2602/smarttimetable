import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Rooms</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Capacity</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="px-4 py-2 font-medium">{r.name}</td><td className="px-4 py-2">{r.code}</td>
              <td className="px-4 py-2">{r.capacity}</td><td className="px-4 py-2">{r.type}</td><td className="px-4 py-2">{r.status}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
