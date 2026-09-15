"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editCourse } from "./actions";

export default function CourseEditForm({
  course, canEdit
}: { course: { id: string; name: string; code: string; status: string }; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canEdit) return null;
  if (!editing) return <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>;

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
