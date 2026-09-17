"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editCourse, deleteCourse } from "./actions";

export default function CourseEditForm({
  course, canEdit, canDelete
}: { course: { id: string; name: string; code: string; status: string }; canEdit: boolean; canDelete?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`Delete ${course.name}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      try { await deleteCourse(course.id); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  if (!editing) {
    return (
      <div>
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
        formData.set("id", course.id);
        startTransition(async () => { await editCourse(formData); setEditing(false); router.refresh(); });
      }}
    >
      <div><label className="label">Name</label><input name="name" defaultValue={course.name} required className="input" /></div>
      <div><label className="label">Code</label><input name="code" defaultValue={course.code} required className="input" /></div>
      <div>
        <label className="label">Status</label>
        <select name="status" defaultValue={course.status} className="input">
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>
      <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
      <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
    </form>
  );
}
