"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createFaculty } from "./actions";

export default function FacultyCreateForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="card p-5">
      <div className="font-medium text-sm mb-3">Add a faculty member</div>
      <form
        ref={formRef}
        className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const res = await createFaculty(formData);
            if (res?.error) { setError(res.error); return; }
            formRef.current?.reset();
            router.refresh();
          });
        }}
      >
        <div><label className="label">Name</label><input name="name" required placeholder="e.g. Rahul Sharma" className="input" /></div>
        <div><label className="label">Employee ID</label><input name="employeeId" required placeholder="e.g. F011" className="input" /></div>
        <div><label className="label">Email</label><input name="email" type="email" className="input" /></div>
        <div><label className="label">Phone</label><input name="phone" className="input" /></div>
        <div><label className="label">Max/day</label><input name="maxClassesPerDay" type="number" min={1} defaultValue={6} className="input" /></div>
        <div><label className="label">Max/week</label><input name="maxClassesPerWeek" type="number" min={1} defaultValue={30} className="input" /></div>
        <button type="submit" className="btn-primary md:col-span-6 w-fit" disabled={pending}>
          {pending ? "Adding..." : "Add Faculty"}
        </button>
      </form>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
