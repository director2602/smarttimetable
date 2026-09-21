"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createLecture, deleteLecture } from "./actions";

export default function SubjectLecturesForm({
  subjectId, chapters, canEdit
}: {
  subjectId: string;
  chapters: { id: string; code: string; name: string }[];
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteLecture(id);
      if (res?.error) { setError(res.error); return; }
      router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <button className="text-xs text-brand-600 hover:underline" onClick={() => setExpanded((e) => !e)}>
        {expanded ? "Hide chapters" : `Chapters (${chapters.length})`}
      </button>

      {expanded && (
        <div className="mt-2 bg-slate-50 rounded-lg p-3">
          {chapters.length === 0 && <p className="text-xs text-slate-400 mb-2">No chapters added yet — the generator will use the subject name until you add some.</p>}
          <div className="space-y-1 mb-2">
            {chapters.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-slate-200">
                <span><span className="font-semibold">{c.code}</span> — {c.name}</span>
                {canEdit && (
                  <button className="text-red-500 hover:text-red-700" disabled={pending} onClick={() => handleDelete(c.id)}>Remove</button>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <form
              ref={formRef}
              className="flex flex-wrap gap-2 items-end"
              action={(formData) => {
                formData.set("subjectId", subjectId);
                setError(null);
                startTransition(async () => {
                  const res = await createLecture(formData);
                  if (res?.error) { setError(res.error); return; }
                  formRef.current?.reset();
                  router.refresh();
                });
              }}
            >
              <input name="code" required placeholder="e.g. PHY-0002" className="input text-xs w-32" />
              <input name="name" required placeholder="e.g. Motion in a Plane" className="input text-xs flex-1" />
              <button type="submit" className="btn-primary py-1 px-2 text-xs" disabled={pending}>{pending ? "Adding..." : "+ Add"}</button>
            </form>
          )}
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
