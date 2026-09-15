"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editAcademicSession } from "./actions";

export default function SessionRow({ session }: { session: { id: string; name: string; startDate: string; endDate: string; active: boolean } }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50/50">
        <td colSpan={5} className="px-4 py-2">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              formData.set("id", session.id);
              startTransition(async () => { await editAcademicSession(formData); setEditing(false); router.refresh(); });
            }}
          >
            <div><label className="label">Name</label><input name="name" defaultValue={session.name} required className="input" /></div>
            <div><label className="label">Start</label><input name="startDate" type="date" defaultValue={session.startDate} required className="input" /></div>
            <div><label className="label">End</label><input name="endDate" type="date" defaultValue={session.endDate} required className="input" /></div>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" name="active" defaultChecked={session.active} /> Active</label>
            <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">{session.name}</td>
      <td className="px-4 py-2">{session.startDate}</td>
      <td className="px-4 py-2">{session.endDate}</td>
      <td className="px-4 py-2">{session.active ? "Yes" : "No"}</td>
      <td className="px-4 py-2 text-right"><button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button></td>
    </tr>
  );
}
