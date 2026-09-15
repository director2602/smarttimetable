"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFacultyAvailability } from "./actions";

const DAYS = [
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
  { d: 0, label: "Sun" }
];

export default function FacultyRosterForm({
  facultyId, availability, canEdit
}: {
  facultyId: string;
  availability: Record<number, boolean>;
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
      await updateFacultyAvailability(facultyId, payload);
      setDirty(false);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {DAYS.map(({ d, label }) => {
        const on = days[d];
        return (
          <button
            key={d}
            type="button"
            disabled={!canEdit}
            onClick={() => toggle(d)}
            className={`text-[11px] px-1.5 py-0.5 rounded border ${
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
      {canEdit && dirty && (
        <button className="btn-primary py-0.5 px-2 text-[11px] ml-1" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
      )}
      {saved && !dirty && <span className="text-[11px] text-green-600 ml-1">Saved</span>}
    </div>
  );
}
