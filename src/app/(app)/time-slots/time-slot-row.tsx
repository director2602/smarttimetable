"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editTimeSlot, deleteTimeSlot } from "./actions";

const DAYS = [
  { v: 1, label: "Mon" }, { v: 2, label: "Tue" }, { v: 3, label: "Wed" }, { v: 4, label: "Thu" },
  { v: 5, label: "Fri" }, { v: 6, label: "Sat" }, { v: 0, label: "Sun" }
];
const DAY_LABEL: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

export default function TimeSlotRow({
  slot
}: {
  slot: { id: string; startTime: string; endTime: string; type: "CLASS" | "BREAK" | "DOUBTS" | "DAY" | "DATE"; daysOfWeek: number[] | null; sortOrder: number };
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set(slot.daysOfWeek || []));
  const router = useRouter();

  function toggleDay(d: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d); else next.add(d);
      return next;
    });
  }

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50/50">
        <td colSpan={5} className="px-4 py-2">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              formData.set("id", slot.id);
              setError(null);
              startTransition(async () => {
                const res = await editTimeSlot(formData);
                if (res?.error) { setError(res.error); return; }
                setEditing(false);
                router.refresh();
              });
            }}
          >
            <div><label className="label">Start</label><input name="startTime" type="time" defaultValue={slot.startTime} required className="input" /></div>
            <div><label className="label">End</label><input name="endTime" type="time" defaultValue={slot.endTime} required className="input" /></div>
            <div>
              <label className="label">Type</label>
              <select name="type" defaultValue={slot.type} className="input">
                <option value="CLASS">CLASS</option>
                <option value="BREAK">BREAK</option>
                <option value="DOUBTS">DOUBTS</option>
                <option value="DAY">DAY</option>
                <option value="DATE">DATE</option>
              </select>
            </div>
            <div>
              <label className="label">Days</label>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleDay(d.v)}
                    className={`text-xs px-1.5 py-0.5 rounded border ${
                      selectedDays.has(d.v) ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
                {Array.from(selectedDays).map((d) => <input key={d} type="hidden" name="daysOfWeek" value={d} />)}
              </div>
            </div>
            <input type="hidden" name="sortOrder" value={slot.sortOrder} />
            <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
            {error && <p className="text-xs text-red-600 w-full">{error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">{slot.startTime}</td>
      <td className="px-4 py-2">{slot.endTime}</td>
      <td className="px-4 py-2">{slot.type === "BREAK" ? <span className="text-amber-600">BREAK</span> : slot.type === "CLASS" ? "CLASS" : <span className="text-brand-500">{slot.type}</span>}</td>
      <td className="px-4 py-2">
        {!slot.daysOfWeek || slot.daysOfWeek.length === 0
          ? <span className="text-slate-400">All days</span>
          : slot.daysOfWeek.map((d) => DAY_LABEL[d]).join(", ")}
      </td>
      <td className="px-4 py-2 text-right space-x-3">
        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
        <button
          className="text-xs text-red-600 hover:underline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete the ${slot.startTime}-${slot.endTime} slot?`)) return;
            setError(null);
            startTransition(async () => {
              const res = await deleteTimeSlot(slot.id);
              if (res?.error) { setError(res.error); return; }
              router.refresh();
            });
          }}
        >
          Delete
        </button>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}
