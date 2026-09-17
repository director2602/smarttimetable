"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTest } from "./actions";

export default function TestRow({
  test
}: {
  test: { id: string; name: string; date: string; batchName: string; startTime: string; endTime: string; roomName: string; notes: string | null };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-medium">{test.name}{test.notes && <div className="text-xs text-slate-400">{test.notes}</div>}</td>
      <td className="px-4 py-2">{test.date}</td>
      <td className="px-4 py-2">{test.batchName}</td>
      <td className="px-4 py-2">{test.startTime}–{test.endTime}</td>
      <td className="px-4 py-2">{test.roomName || "—"}</td>
      <td className="px-4 py-2 text-right">
        <button
          className="text-xs text-red-600 hover:underline"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Delete "${test.name}"?`)) return;
            setError(null);
            startTransition(async () => {
              const res = await deleteTest(test.id);
              if (res?.error) { setError(res.error); return; }
              router.refresh();
            });
          }}
        >
          {pending ? "Deleting..." : "Delete"}
        </button>
        {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
      </td>
    </tr>
  );
}
