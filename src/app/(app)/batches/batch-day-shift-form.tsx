"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBatchDayShifts } from "./actions";

const DAYS = [
  { d: 1, label: "Mon" }, { d: 2, label: "Tue" }, { d: 3, label: "Wed" }, { d: 4, label: "Thu" },
  { d: 5, label: "Fri" }, { d: 6, label: "Sat" }, { d: 0, label: "Sun" }
];

type Shift = "NONE" | "MORNING" | "EVENING";
type DayState = { available: boolean; shift: Shift };

export default function BatchDayShiftForm({
  batchId, initial, canEdit
}: {
  batchId: string;
  initial: Record<number, { available: boolean; shift: Shift }>;
  canEdit: boolean;
}) {
  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const state: Record<number, DayState> = {};
    for (const { d } of DAYS) {
      state[d] = initial[d] ?? { available: d !== 0, shift: "NONE" };
    }
    return state;
  });
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function toggleAvailable(d: number) {
    if (!canEdit) return;
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], available: !prev[d].available } }));
    setDirty(true);
  }

  function setShift(d: number, shift: Shift) {
    if (!canEdit) return;
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], shift } }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const payload = DAYS.map(({ d }) => ({ dayOfWeek: d, available: days[d].available, shift: days[d].shift }));
      const res = await updateBatchDayShifts(batchId, payload);
      if (res?.error) { setError(res.error); return; }
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1">Working days &amp; shift (per day)</div>
      <div className="space-y-1">
        {DAYS.map(({ d, label }) => {
          const state = days[d];
          return (
            <div key={d} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => toggleAvailable(d)}
                className={`text-xs px-2 py-1 rounded border w-12 ${
                  state.available
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "bg-slate-100 border-slate-200 text-slate-400 line-through"
                }`}
              >
                {label}
              </button>
              {state.available && (
                <div className="flex gap-1">
                  {(["NONE", "MORNING", "EVENING"] as Shift[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setShift(d, s)}
                      className={`text-[11px] px-1.5 py-0.5 rounded border ${
                        state.shift === s ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"
                      }`}
                      title={s === "MORNING" ? "8:00 AM-2:30 PM" : s === "EVENING" ? "3:00 PM-8:00 PM" : "No fixed shift"}
                    >
                      {s === "NONE" ? "Custom" : s === "MORNING" ? "Morning" : "Evening"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {canEdit && dirty && (
        <button className="btn-primary py-1 px-3 text-xs mt-2" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </button>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
