"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editRoom } from "./actions";

export default function RoomEditForm({
  room, canEdit
}: {
  room: { id: string; name: string; code: string; capacity: number; type: string; building: string | null; floor: string | null; status: string };
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return null;
  if (!editing) return <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>;

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 bg-slate-50 rounded-lg p-3"
      action={(formData) => {
        formData.set("id", room.id);
        setError(null);
        startTransition(async () => {
          try { await editRoom(formData); setEditing(false); router.refresh(); }
          catch (e) { setError((e as Error).message); }
        });
      }}
    >
      <div><label className="label">Name</label><input name="name" defaultValue={room.name} required className="input" /></div>
      <div><label className="label">Code</label><input name="code" defaultValue={room.code} required className="input" /></div>
      <div><label className="label">Capacity</label><input name="capacity" type="number" min={1} defaultValue={room.capacity} required className="input w-24" /></div>
      <div><label className="label">Type</label><input name="type" defaultValue={room.type} required className="input" /></div>
      <div><label className="label">Building</label><input name="building" defaultValue={room.building || ""} className="input" /></div>
      <div><label className="label">Floor</label><input name="floor" defaultValue={room.floor || ""} className="input w-20" /></div>
      <div>
        <label className="label">Status</label>
        <select name="status" defaultValue={room.status} className="input">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
      <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}
