"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTimetable } from "./actions";

export default function DeleteTimetableButton({ id, weekStartDate }: { id: string; weekStartDate: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span>
      <button
        className="text-xs text-red-600 hover:underline"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete the timetable for week of ${weekStartDate}? This removes all its scheduled classes too. This cannot be undone.`)) return;
          setError(null);
          startTransition(async () => {
            try { await deleteTimetable(id); router.refresh(); }
            catch (e) { setError((e as Error).message); }
          });
        }}
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </span>
  );
}
