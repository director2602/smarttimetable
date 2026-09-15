import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { rooms, userPermissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePermission, type Role } from "@/lib/permissions";
import { createRoom } from "./actions";
import RoomEditForm from "./room-edit-form";
import { Fragment } from "react";

export default async function RoomsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, overrides] = await Promise.all([
    db.query.rooms.findMany({ where: eq(rooms.organizationId, user.organizationId) }),
    db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) })
  ]);
  const canEdit = resolvePermission(user.role as Role, overrides, "ROOM_EDIT");
  const canCreate = resolvePermission(user.role as Role, overrides, "ROOM_CREATE");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Rooms</h1>
      {canCreate && (
        <div className="card p-5">
          <form action={createRoom} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div><label className="label">Name</label><input name="name" required placeholder="Room 109" className="input" /></div>
            <div><label className="label">Code</label><input name="code" required placeholder="R109" className="input" /></div>
            <div><label className="label">Capacity</label><input name="capacity" type="number" min={1} required className="input" /></div>
            <div><label className="label">Type</label><input name="type" defaultValue="CLASSROOM" required className="input" /></div>
            <div><label className="label">Building</label><input name="building" className="input" /></div>
            <input type="hidden" name="status" value="ACTIVE" />
            <button className="btn-primary">Add Room</button>
          </form>
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Capacity</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{r.name}</td><td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2">{r.capacity}</td><td className="px-4 py-2">{r.type}</td><td className="px-4 py-2">{r.status}</td>
                  <td className="px-4 py-2 text-right"><RoomEditForm room={r} canEdit={canEdit} /></td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
