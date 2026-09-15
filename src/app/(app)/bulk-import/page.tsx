"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { bulkImportAndGenerate } from "./actions";

type Result = Awaited<ReturnType<typeof bulkImportAndGenerate>>;

export default function BulkImportPage() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">One-Time Bulk Setup</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a single Excel workbook covering Courses, Subjects, Rooms, Time Slots, Holidays, Batches
          (with weekly subject requirements) and Faculty (with their subject and batch allotment) — then a
          draft timetable is generated automatically from what you uploaded.
        </p>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-medium text-sm">Step 1 — Download the template</div>
            <p className="text-xs text-slate-500 mt-0.5">One workbook, one sheet per section, with instructions and sample rows.</p>
          </div>
          <a href="/bulk-import/template" className="btn-secondary">Download template</a>
        </div>
      </div>

      <div className="card p-5">
        <div className="font-medium text-sm mb-1">Step 2 — Upload your filled workbook</div>
        <p className="text-xs text-slate-500 mb-3">
          Every sheet is optional — leave any blank if that data already exists or isn't needed yet. Existing
          records are matched by code/name and updated, not duplicated, so it's safe to re-upload.
        </p>
        <form
          ref={formRef}
          className="flex flex-wrap items-center gap-3"
          action={(formData) => {
            setError(null);
            setResult(null);
            startTransition(async () => {
              try {
                const res = await bulkImportAndGenerate(formData);
                setResult(res);
                formRef.current?.reset();
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            });
          }}
        >
          <input type="file" name="file" accept=".xlsx,.xls" required className="text-sm" />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Processing..." : "Upload & Generate"}
          </button>
        </form>
      </div>

      {error && (
        <div className="card p-5 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="font-medium text-sm mb-3">Import summary</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {result.reports.map((r) => (
                <div key={r.section} className="border border-slate-200 rounded-lg p-3">
                  <div className="text-xs text-slate-500">{r.section}</div>
                  <div className="text-sm mt-1">
                    <span className="text-green-700 font-medium">{r.created} created</span>
                    {" · "}
                    <span className="text-brand-600 font-medium">{r.updated} updated</span>
                  </div>
                  {r.warnings.length > 0 && (
                    <div className="text-xs text-amber-600 mt-1">{r.warnings.length} warning(s)</div>
                  )}
                </div>
              ))}
            </div>
            {result.reports.some((r) => r.warnings.length > 0) && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 max-h-48 overflow-y-auto">
                {result.reports.flatMap((r) => r.warnings.map((w, i) => (
                  <div key={`${r.section}-${i}`}>{r.section}: {w}</div>
                )))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="font-medium text-sm mb-2">Timetable generation</div>
            {result.generation ? (
              <div className="text-sm">
                <p>
                  Draft timetable created for the week of <strong>{result.generation.weekStartDate}</strong> —{" "}
                  {result.generation.scheduledTotal} of {result.generation.requiredTotal} required classes
                  scheduled, quality score <strong>{result.generation.qualityScore}/100</strong>.
                </p>
                <a href={`/timetable/${result.generation.timetableId}`} className="btn-primary inline-flex mt-3">
                  View generated timetable
                </a>
              </div>
            ) : (
              <p className="text-sm text-amber-700">{result.generationSkippedReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
