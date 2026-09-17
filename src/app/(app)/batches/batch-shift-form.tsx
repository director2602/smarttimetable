"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBatchShift } from "./actions";

const SHIFTS: { value: "NONE" | "MORNING" | "EVENING"; label: string }[] = [
  { value: "NONE", label: "No fixed shift" },
  { value: "MORNING", label: "Morning (8:00 AM–2:30 PM)" },
  { value: "EVENING", label: "Evening (3:00 PM–8:00 PM)" }
];

export default function BatchShiftForm({
  batchId, currentShift, canEdit
}: {
  batchId: string;
  currentShift: "NONE" | "MORNING" | "EVENING";
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function pick(shift: "NONE" | "MORNING" | "EVENING") {
    if (shift === currentShift) return;
    setError(null);
    startTransition(async () => {
      const res = await setBatchShift(batchId, shift);
      if (res?.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <div className="text-xs text-slate-500 mb-1">Shift</div>
      <div className="flex flex-wrap gap-1">
        {SHIFTS.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={!canEdit || pending}
            onClick={() => pick(s.value)}
            className={`text-xs px-2 py-1 rounded border ${
              currentShift === s.value
                ? "bg-brand-100 border-brand-400 text-brand-700"
                : "bg-white border-slate-200 text-slate-500"
            } ${canEdit ? "cursor-pointer" : "cursor-default opacity-70"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {currentShift !== "NONE" && (
        <p className="text-xs text-slate-400 mt-1">
          Applied to every working day currently marked available for this batch. Turning a day off in the
          roster below still overrides this.
        </p>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
