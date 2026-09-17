"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createFaculty } from "./actions";

export default function FacultyCreateForm({ allSubjects }: { allSubjects: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="card p-5">
      <div className="font-medium text-sm mb-3">Add a faculty member</div>
      <form
        ref={formRef}
        className="space-y-3"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await createFaculty(formData);
            if (res?.error) { setError(res.error); return; }
            formRef.current?.reset();
            setSelectedSubjects(new Set());
            router.refresh();
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div><label className="label">Name</label><input name="name" required placeholder="e.g. Rahul Sharma" className="input" /></div>
          <div><label className="label">Employee ID (optional)</label><input name="employeeId" placeholder="auto-generated if blank" className="input" /></div>
          <div><label className="label">Email</label><input name="email" type="email" className="input" /></div>
          <div><label className="label">Phone</label><input name="phone" className="input" /></div>
          <div><label className="label">Max/day</label><input name="maxClassesPerDay" type="number" min={1} defaultValue={6} className="input" /></div>
          <div><label className="label">Max/week</label><input name="maxClassesPerWeek" type="number" min={1} defaultValue={30} className="input" /></div>
        </div>

        <div>
          <label className="label">Subjects (optional — can also be set later)</label>
          <div className="flex flex-wrap gap-1">
            {allSubjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSubject(s.id)}
                className={`text-xs px-2 py-1 rounded border ${
                  selectedSubjects.has(s.id)
                    ? "bg-brand-100 border-brand-400 text-brand-700"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {s.name}
              </button>
            ))}
            {allSubjects.length === 0 && <span className="text-xs text-slate-400">No subjects configured yet.</span>}
            {Array.from(selectedSubjects).map((id) => (
              <input key={id} type="hidden" name="subjectIds" value={id} />
            ))}
          </div>
        </div>

        <button type="submit" className="btn-primary w-fit" disabled={pending}>
          {pending ? "Adding..." : "Add Faculty"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
