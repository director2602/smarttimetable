"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishTimetableAction } from "../generate/actions";

export default function PublishButton({ timetableId }: { timetableId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await publishTimetableAction(timetableId);
            if (res?.error) setError(res.error);
            else router.refresh();
          });
        }}
      >
        {pending ? "Publishing..." : "Publish Timetable"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
