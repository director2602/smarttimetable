"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editTimeSlot, deleteTimeSlot } from "./actions";

export default function TimeSlotRow({
  slot
}: {
  slot: { id: string; startTime: string; endTime: string; type: "CLASS" | "BREAK" };
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (editing) {
    return (
      <tr className="border-t border-slate-100 bg-slate-50/50">
        <td colSpan={4} className="px-4 py-2">
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              formData.set("id", slot.id);
              startTransition(async () => {
                await editTimeSlot(formData);
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
              </select>
            </div>
            <input type="hidden" name="sortOrder" value={0} />
            <button type="submit" className="btn-primary py-1 px-3 text-xs" disabled={pending}>{pending ? "Saving..." : "Save"}</button>
            <button type="button" className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditing(false)}>Cancel</button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2">{slot.startTime}</td>
      <td className="px-4 py-2">{slot.endTime}</td>
      <td className="px-4 py-2">{slot.type === "BREAK" ? <span className="text-amber-600">BREAK</span> : "CLASS"}</td>
      <td className="px-4 py-2 text-right space-x-3">
        <button className="text-xs text-brand-600 hover:underline" onClick={() => setEditing(true)}>Edit</button>
        <button
          className="text-xs text-red-600 hover:underline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete the ${slot.startTime}-${slot.endTime} slot?`)) return;
            startTransition(async () => { await deleteTimeSlot(slot.id); router.refresh(); });
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
