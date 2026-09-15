"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBatchAvailability } from "./actions";

const DAYS = [
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
  { d: 0, label: "Sun" }
];

export default function BatchRosterForm({
  batchId, availability, canEdit
}: {
  batchId: string;
  availability: Record<number, boolean>; // dayOfWeek -> available
  canEdit: boolean;
}) {
  const [days, setDays] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const { d } of DAYS) initial[d] = availability[d] ?? (d !== 0);
    return initial;
  });
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  function toggle(d: number) {
    if (!canEdit) return;
    setDays((prev) => ({ ...prev, [d]: !prev[d] }));
    setDirty(true);
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const payload = DAYS.map(({ d }) => ({ dayOfWeek: d, available: days[d] }));
      await updateBatchAvailability(batchId, payload);
      setDirty(false);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1">Working days roster</div>
      <div className="flex gap-1 flex-wrap">
        {DAYS.map(({ d, label }) => {
          const on = days[d];
          return (
            <button
              key={d}
              type="button"
              disabled={!canEdit}
              onClick={() => toggle(d)}
              className={`text-xs px-2 py-1 rounded border ${
                on
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-slate-100 border-slate-200 text-slate-400 line-through"
              } ${canEdit ? "cursor-pointer" : "cursor-default opacity-80"}`}
              title={on ? `${label}: working day` : `${label}: week off`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {canEdit && dirty && (
        <button className="btn-primary py-1 px-3 text-xs mt-2" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save roster"}
        </button>
      )}
      {saved && !dirty && <div className="text-xs text-green-600 mt-1">Roster saved.</div>}
    </div>
  );
}
