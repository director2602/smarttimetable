"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTimeSlot } from "./actions";

const DAYS = [
  { v: "", label: "All days" },
  { v: "1", label: "Monday" },
  { v: "2", label: "Tuesday" },
  { v: "3", label: "Wednesday" },
  { v: "4", label: "Thursday" },
  { v: "5", label: "Friday" },
  { v: "6", label: "Saturday" },
  { v: "0", label: "Sunday" }
];

export default function TimeSlotCreateForm({ nextSortOrder }: { nextSortOrder: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="card p-5">
      <form
        ref={formRef}
        className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await createTimeSlot(formData);
            if (res?.error) { setError(res.error); return; }
            formRef.current?.reset();
            router.refresh();
          });
        }}
      >
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
        <div>
          <label className="label">Day</label>
          <select name="dayOfWeek" className="input" defaultValue="">
            {DAYS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
          </select>
        </div>
        <input type="hidden" name="sortOrder" value={nextSortOrder} />
        <button className="btn-primary" disabled={pending}>{pending ? "Adding..." : "Add Slot"}</button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
