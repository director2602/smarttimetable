"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createManualEntry } from "./manual-entry-actions";

export default function ManualEntryForm({
  timetableId, batches, rooms, subjects, faculty
}: {
  timetableId: string;
  batches: { id: string; name: string }[];
  rooms: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  faculty: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"REGULAR" | "LABEL">("LABEL");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="card p-4">
      <button className="text-sm text-brand-600 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? "Close" : "+ Add a class manually (Self Study, Recordings, one-off class)"}
      </button>

      {open && (
        <form
          ref={formRef}
          className="mt-3 space-y-3"
          action={(formData) => {
            formData.set("timetableId", timetableId);
            formData.set("kind", kind);
            setError(null);
            startTransition(async () => {
              const res = await createManualEntry(formData);
              if (res?.error) { setError(res.error); return; }
              formRef.current?.reset();
              router.refresh();
            });
          }}
        >
          <div className="flex gap-2">
            <button type="button" onClick={() => setKind("LABEL")} className={`text-xs px-2 py-1 rounded border ${kind === "LABEL" ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"}`}>
              Self Study / Recordings / Other
            </button>
            <button type="button" onClick={() => setKind("REGULAR")} className={`text-xs px-2 py-1 rounded border ${kind === "REGULAR" ? "bg-brand-100 border-brand-400 text-brand-700" : "bg-white border-slate-200 text-slate-500"}`}>
              Regular class
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Batch</label>
              <select name="batchId" required className="input">
                <option value="">Select...</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Room</label>
              <select name="roomId" required className="input">
                <option value="">Select...</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div><label className="label">Date</label><input name="date" type="date" required className="input" /></div>
            <div><label className="label">Start</label><input name="startTime" type="time" required className="input" /></div>
            <div><label className="label">End</label><input name="endTime" type="time" required className="input" /></div>

            {kind === "REGULAR" ? (
              <>
                <div>
                  <label className="label">Subject</label>
                  <select name="subjectId" className="input">
                    <option value="">Select...</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Faculty</label>
                  <select name="facultyId" className="input">
                    <option value="">Select...</option>
                    {faculty.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div className="md:col-span-1">
                <label className="label">Label</label>
                <input name="label" placeholder='e.g. "Self Study & Doubts" or "Recordings"' className="input" />
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={pending}>{pending ? "Adding..." : "Add"}</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
