"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTimeSlot } from "./actions";

const DAYS = [
  { v: 1, label: "Mon" }, { v: 2, label: "Tue" }, { v: 3, label: "Wed" }, { v: 4, label: "Thu" },
  { v: 5, label: "Fri" }, { v: 6, label: "Sat" }, { v: 0, label: "Sun" }
];

export default function TimeSlotCreateForm({ nextSortOrder }: { nextSortOrder: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function toggleDay(d: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  return (
    <div className="card p-5">
      <form
        ref={formRef}
        className="space-y-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await createTimeSlot(formData);
            if (res?.error) { setError(res.error); return; }
            formRef.current?.reset();
            setSelectedDays(new Set());
            router.refresh();
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div><label className="label">Start</label><input name="startTime" type="time" required className="input" /></div>
          <div><label className="label">End</label><input name="endTime" type="time" required className="input" /></div>
          <div>
            <label className="label">Type</label>
            <select name="type" className="input" defaultValue="CLASS">
              <option value="CLASS">CLASS</option>
              <option value="BREAK">BREAK</option>
              <option value="DOUBTS">DOUBTS</option>
              <option value="DAY">DAY</option>
              <option value="DATE">DATE</option>
            </select>
          </div>
          <input type="hidden" name="sortOrder" value={nextSortOrder} />
          <button className="btn-primary" disabled={pending}>{pending ? "Adding..." : "Add Slot"}</button>
        </div>

        <div>
          <label className="label">Days (leave all unchecked for every working day)</label>
          <div className="flex flex-wrap gap-1">
            {DAYS.map((d) => (
              <button
                key={d.v}
                type="button"
                onClick={() => toggleDay(d.v)}
                className={`text-xs px-2 py-1 rounded border ${
                  selectedDays.has(d.v) ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {d.label}
              </button>
            ))}
            {Array.from(selectedDays).map((d) => <input key={d} type="hidden" name="daysOfWeek" value={d} />)}
          </div>
        </div>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
