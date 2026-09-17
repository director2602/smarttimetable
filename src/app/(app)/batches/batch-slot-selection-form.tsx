"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBatchTimeSlots } from "./actions";

export default function BatchSlotSelectionForm({
  batchId, allSlots, selectedSlotIds, canEdit
}: {
  batchId: string;
  allSlots: { id: string; label: string }[];
  selectedSlotIds: string[]; // empty = "all slots allowed" (no restriction configured yet)
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedSlotIds));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      await updateBatchTimeSlots(batchId, Array.from(selected));
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500">Time slots:</span>
        {selectedSlotIds.length === 0 ? (
          <span className="text-xs text-slate-400">All configured slots allowed</span>
        ) : (
          <span className="text-xs text-slate-600">{selectedSlotIds.length} of {allSlots.length} slots selected</span>
        )}
        {canEdit && (
          <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-xs text-slate-500 mb-2">
        Select which time slots this batch may be scheduled in. Leave all unchecked to allow every configured slot.
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {allSlots.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => toggle(s.id)}
            className={`text-xs px-2 py-1 rounded border ${
              selected.has(s.id)
                ? "bg-brand-100 border-brand-400 text-brand-700"
                : "bg-white border-slate-200 text-slate-500"
            }`}
          >
            {s.label}
          </button>
        ))}
        {allSlots.length === 0 && <span className="text-xs text-slate-400">No time slots configured yet.</span>}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary py-1 px-3 text-xs" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary py-1 px-3 text-xs" onClick={() => { setEditing(false); setSelected(new Set(selectedSlotIds)); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
