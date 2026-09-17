import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { tests, batches, rooms } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import TestCreateForm from "./test-create-form";
import TestRow from "./test-row";

export default async function TestsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rows, batchRows, roomRows] = await Promise.all([
    db.query.tests.findMany({ where: eq(tests.organizationId, user.organizationId), orderBy: [desc(tests.date)] }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) })
  ]);
  const batchById = new Map(batchRows.map((b) => [b.id, b]));
  const roomById = new Map(roomRows.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Tests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Record named tests for each batch — a new test every week is expected, so each one gets its own name
          (e.g. "Weekly Test 12 — Kinematics").
        </p>
      </div>

      <TestCreateForm batches={batchRows.map((b) => ({ id: b.id, name: b.name }))} rooms={roomRows.map((r) => ({ id: r.id, name: r.name }))} />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">Test Name</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Batch</th><th className="px-4 py-2">Time</th><th className="px-4 py-2">Room</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <TestRow
                key={t.id}
                test={{
                  id: t.id, name: t.name, date: t.date,
                  batchName: batchById.get(t.batchId)?.name || "Unknown",
                  startTime: t.startTime, endTime: t.endTime,
                  roomName: t.roomId ? roomById.get(t.roomId)?.name || "" : "",
                  notes: t.notes
                }}
              />
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No tests recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
