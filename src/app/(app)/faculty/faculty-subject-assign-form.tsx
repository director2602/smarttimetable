"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFacultySubjects } from "./actions";

export default function FacultySubjectAssignForm({
  facultyId, allSubjects, assignedSubjectIds, canEdit
}: {
  facultyId: string;
  allSubjects: { id: string; name: string }[];
  assignedSubjectIds: string[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedSubjectIds));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const assignedNames = allSubjects.filter((s) => assignedSubjectIds.includes(s.id)).map((s) => s.name);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateFacultySubjects(facultyId, Array.from(selected));
      if (res?.error) { setError(res.error); return; }
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Subjects:</span>
        {assignedNames.length === 0 ? (
          <span className="text-xs text-slate-400">None assigned</span>
        ) : (
          assignedNames.map((n) => <span key={n} className="text-xs bg-slate-100 rounded px-2 py-0.5">{n}</span>)
        )}
        {canEdit && (
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>
            {assignedNames.length === 0 ? "Assign subjects" : "Edit"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-2">Select subjects this faculty teaches:</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {allSubjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className={`text-xs px-2 py-1 rounded border ${
              selected.has(s.id) ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            {s.name}
          </button>
        ))}
        {allSubjects.length === 0 && <span className="text-xs text-slate-400">No subjects exist yet.</span>}
      </div>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary py-1 px-3 text-xs" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save"}</button>
        <button className="btn-secondary py-1 px-3 text-xs" onClick={() => { setEditing(false); setSelected(new Set(assignedSubjectIds)); }}>Cancel</button>
      </div>
    </div>
  );
}
