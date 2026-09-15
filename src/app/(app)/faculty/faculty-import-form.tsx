"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { importFacultyFromExcel } from "./actions";

export default function FacultyImportForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ rowsProcessed: number; created: number; updated: number; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">Bulk import faculty from Excel</div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload a sheet with Name, Employee ID, Subjects and Batches to create or update faculty and their
            batch/subject allotment in one go.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/faculty/import-template" className="btn-secondary text-sm">Download template</a>
          <button className="btn-primary text-sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Upload Excel"}
          </button>
        </div>
      </div>

      {open && (
        <form
          ref={formRef}
          className="mt-4 flex flex-wrap items-center gap-3"
          action={(formData) => {
            setError(null);
            setResult(null);
            startTransition(async () => {
              try {
                const res = await importFacultyFromExcel(formData);
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
          <button type="submit" className="btn-primary text-sm" disabled={pending}>
            {pending ? "Importing..." : "Import"}
          </button>
        </form>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

      {result && (
        <div className="mt-4 text-sm">
          <p className="text-green-700 font-medium">
            Processed {result.rowsProcessed} row{result.rowsProcessed === 1 ? "" : "s"} —
            {" "}{result.created} faculty created, {result.updated} updated.
          </p>
          {result.warnings.length > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="font-medium text-amber-700 mb-1">{result.warnings.length} warning(s):</div>
              <ul className="list-disc list-inside text-amber-700 space-y-0.5">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
