"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBatchRequirement, removeBatchRequirement } from "./actions";

export default function BatchRequirementsForm({
  batchId, requirements, allSubjects, canEdit
}: {
  batchId: string;
  requirements: { subjectId: string; subjectName: string; classesPerWeek: number }[];
  allSubjects: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleRemove(subjectId: string) {
    startTransition(async () => { await removeBatchRequirement(batchId, subjectId); router.refresh(); });
  }

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1">Weekly subject requirements</div>
      <div className="flex flex-wrap gap-1 items-center">
        {requirements.map((r) => (
          <span key={r.subjectId} className="text-xs bg-slate-100 rounded px-2 py-0.5 inline-flex items-center gap-1">
            {r.subjectName} × {r.classesPerWeek}/wk
            {canEdit && (
              <button className="text-red-500 hover:text-red-700" disabled={pending} onClick={() => handleRemove(r.subjectId)} title="Remove">×</button>
            )}
          </span>
        ))}
        {requirements.length === 0 && <span className="text-xs text-slate-400">None set — the scheduler has nothing to place for this batch.</span>}
        {canEdit && !adding && (
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setAdding(true)}>+ Add</button>
        )}
      </div>

      {adding && (
        <form
          className="mt-2 flex flex-wrap items-end gap-2 bg-slate-50 rounded-lg p-2"
          action={(formData) => {
            formData.set("batchId", batchId);
            setError(null);
            startTransition(async () => {
              try { await setBatchRequirement(formData); setAdding(false); router.refresh(); }
              catch (e) { setError((e as Error).message); }
            });
          }}
        >
          <select name="subjectId" required className="input text-xs">
            <option value="">Subject...</option>
            {allSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input name="classesPerWeek" type="number" min={1} max={20} placeholder="Classes/wk" required className="input text-xs w-24" />
          <button type="submit" className="btn-primary py-1 px-2 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
          <button type="button" className="btn-secondary py-1 px-2 text-xs" onClick={() => setAdding(false)}>Cancel</button>
          {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        </form>
      )}
    </div>
  );
}
