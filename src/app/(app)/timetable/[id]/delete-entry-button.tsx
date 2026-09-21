"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteManualEntry } from "./manual-entry-actions";

export default function DeleteEntryButton({ entryId, timetableId }: { entryId: string; timetableId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      className="absolute top-0 right-0 text-[10px] text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 px-1"
      disabled={pending}
      title="Remove this entry"
      onClick={() => {
        if (!confirm("Remove this entry from the timetable?")) return;
        startTransition(async () => {
          await deleteManualEntry(entryId, timetableId);
          router.refresh();
        });
      }}
    >
      ×
    </button>
  );
}
