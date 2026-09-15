"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editBatch } from "./actions";

export default function BatchEditForm({
  batch, canEdit
}: {
  batch: { id: string; name: string; code: string; studentCount: number; maxClassesPerDay: number; maxConsecutiveClasses: number };
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canEdit) return null;

  if (!editing) {
    return (
      <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>
        Edit
      </button>
    );
  }

  return (
    <form
      className="mt-3 border-t border-slate-100 pt-3 space-y-2"
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await editBatch(formData);
            setEditing(false);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <input type="hidden" name="id" value={batch.id} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Batch name</label>
          <input name="name" defaultValue={batch.name} required className="input" />
        </div>
        <div>
          <label className="label">Code</label>
          <input name="code" defaultValue={batch.code} required className="input" />
        </div>
        <div>
          <label className="label">Students</label>
          <input name="studentCount" type="number" min={0} defaultValue={batch.studentCount} required className="input" />
        </div>
        <div>
          <label className="label">Max/day</label>
          <input name="maxClassesPerDay" type="number" min={1} defaultValue={batch.maxClassesPerDay} required className="input" />
        </div>
        <div className="col-span-2">
          <label className="label">Max consecutive classes</label>
          <input name="maxConsecutiveClasses" type="number" min={1} defaultValue={batch.maxConsecutiveClasses} required className="input" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
