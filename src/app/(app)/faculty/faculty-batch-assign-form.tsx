"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFacultyBatches } from "./actions";

export default function FacultyBatchAssignForm({
  facultyId, allBatches, assignedBatchIds, canEdit
}: {
  facultyId: string;
  allBatches: { id: string; name: string }[];
  assignedBatchIds: string[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedBatchIds));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const assignedNames = allBatches.filter((b) => assignedBatchIds.includes(b.id)).map((b) => b.name);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateFacultyBatches(facultyId, Array.from(selected));
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Batches:</span>
        {assignedNames.length === 0 ? (
          <span className="text-xs text-slate-400">None assigned</span>
        ) : (
          assignedNames.map((n) => (
            <span key={n} className="text-xs bg-slate-100 rounded px-2 py-0.5">{n}</span>
          ))
        )}
        {canEdit && (
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>
            {assignedNames.length === 0 ? "Assign batches" : "Edit"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-2">Select batches this faculty teaches:</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {allBatches.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => toggle(b.id)}
            className={`text-xs px-2 py-1 rounded border ${
              selected.has(b.id)
                ? "bg-brand-100 border-brand-400 text-brand-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            {b.name}
          </button>
        ))}
        {allBatches.length === 0 && <span className="text-xs text-slate-400">No batches exist yet.</span>}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary py-1 px-3 text-xs" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary py-1 px-3 text-xs" onClick={() => { setEditing(false); setSelected(new Set(assignedBatchIds)); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
