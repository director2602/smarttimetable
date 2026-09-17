"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editFaculty, deleteFaculty } from "./actions";

export default function FacultyEditForm({
  f, canEdit, canDelete
}: {
  f: { id: string; name: string; employeeId: string; email: string | null; phone: string | null; maxClassesPerDay: number; maxClassesPerWeek: number; status: string };
  canEdit: boolean;
  canDelete?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Delete ${f.name}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try { await deleteFaculty(f.id); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  if (!editing) {
    return (
      <div className="text-right">
        <div className="space-x-3">
          {canEdit && <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>}
          {canDelete && <button className="text-xs text-red-600 hover:underline" disabled={pending} onClick={handleDelete}>{pending ? "Deleting..." : "Delete"}</button>}
        </div>
        {error && <p className="text-xs text-red-600 mt-1 max-w-xs ml-auto text-left">{error}</p>}
      </div>
    );
  }

  return (
    <form
      className="mt-2 flex flex-wrap items-end gap-2 bg-slate-50 rounded-lg p-3"
      action={(formData) => {
        formData.set("id", f.id);
        setError(null);
        startTransition(async () => {
          try {
            await editFaculty(formData);
            setEditing(false);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <div><label className="label">Name</label><input name="name" defaultValue={f.name} required className="input" /></div>
      <div><label className="label">Employee ID</label><input name="employeeId" defaultValue={f.employeeId} required className="input" /></div>
      <div><label className="label">Email</label><input name="email" type="email" defaultValue={f.email || ""} className="input" /></div>
      <div><label className="label">Phone</label><input name="phone" defaultValue={f.phone || ""} className="input" /></div>
      <div><label className="label">Max/day</label><input name="maxClassesPerDay" type="number" min={1} defaultValue={f.maxClassesPerDay} required className="input w-20" /></div>
      <div><label className="label">Max/week</label><input name="maxClassesPerWeek" type="number" min={1} defaultValue={f.maxClassesPerWeek} required className="input w-20" /></div>
      <div>
        <label className="label">Status</label>
        <select name="status" defaultValue={f.status} className="input">
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
