"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTest } from "./actions";

export default function TestCreateForm({
  batches, rooms
}: {
  batches: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="card p-5">
      <div className="font-medium text-sm mb-3">Add a test</div>
      <form
        ref={formRef}
        className="grid grid-cols-1 md:grid-cols-3 gap-3"
        action={(formData) => {
          setError(null);
          setWarning(null);
          startTransition(async () => {
            const res = await createTest(formData);
            if (res?.error) { setError(res.error); return; }
            if (res?.warning) setWarning(res.warning);
            formRef.current?.reset();
            router.refresh();
          });
        }}
      >
        <div className="md:col-span-3">
          <label className="label">Test name</label>
          <input name="name" required placeholder='e.g. "Weekly Test 12 — Kinematics"' className="input" />
        </div>
        <div><label className="label">Date</label><input name="date" type="date" required className="input" /></div>
        <div>
          <label className="label">Batch</label>
          <select name="batchId" required className="input">
            <option value="">Select...</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Room (optional)</label>
          <select name="roomId" className="input">
            <option value="">None</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div><label className="label">Start time</label><input name="startTime" type="time" required className="input" /></div>
        <div><label className="label">End time</label><input name="endTime" type="time" required className="input" /></div>
        <div><label className="label">Notes (optional)</label><input name="notes" className="input" /></div>
        <button type="submit" className="btn-primary md:col-span-3 w-fit" disabled={pending}>
          {pending ? "Adding..." : "Add Test"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {warning && <p className="text-sm text-amber-600 mt-2">{warning}</p>}
    </div>
  );
}
