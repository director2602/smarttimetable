"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editHoliday, deleteHoliday } from "./actions";

export default function HolidayRow({ holiday }: { holiday: { id: string; date: string; name: string } }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50/50">
        <td colSpan={3} className="px-4 py-2">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              formData.set("id", holiday.id);
              startTransition(async () => { await editHoliday(formData); setEditing(false); router.refresh(); });
            }}
          >
            <div><label className="label">Date</label><input name="date" type="date" defaultValue={holiday.date} required className="input" /></div>
            <div><label className="label">Name</label><input name="name" defaultValue={holiday.name} required className="input" /></div>
            <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">{holiday.date}</td>
      <td className="px-4 py-2">{holiday.name}</td>
      <td className="px-4 py-2 text-right space-x-3">
        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
        <button
          className="text-xs text-red-600 hover:underline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete ${holiday.name}?`)) return;
            startTransition(async () => { await deleteHoliday(holiday.id); router.refresh(); });
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
