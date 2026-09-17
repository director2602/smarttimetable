"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateTimetableAction, saveGeneratedTimetableAction } from "./actions";

type Attempt = Awaited<ReturnType<typeof generateTimetableAction>>[number];

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (8 - day) % 7 || 7;
  d.setDate(d.getDate() + (day === 1 ? 0 : diff));
  return d.toISOString().slice(0, 10);
}

export default function GenerateClient({
  sessions, courses, batches
}: {
  sessions: { id: string; name: string }[];
  courses: { id: string; name: string }[];
  batches: { id: string; name: string; courseId: string }[];
}) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(sessions[0]?.id || "");
  const [weekStart, setWeekStart] = useState(nextMonday());
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const filteredBatches = courseId ? batches.filter((b) => b.courseId === courseId) : batches;

  async function handleGenerate() {
    setPhase("generating");
    setAttempts([]);
    try {
      const results = await generateTimetableAction({
        academicSessionId: sessionId,
        weekStartDate: weekStart,
        courseId: courseId || undefined,
        batchId: batchId || undefined
      });
      setAttempts(results);
      setSelected(0);
      setPhase("done");
    } catch (e) {
      setPhase("idle");
      alert("Generation failed: " + (e as Error).message);
    }
  }

  async function handleSave() {
    if (!attempts[selected]) return;
    setSaving(true);
    const a = attempts[selected];
    const res = await saveGeneratedTimetableAction({
      academicSessionId: sessionId,
      weekStartDate: weekStart,
      qualityScore: a.qualityScore,
      requiredTotal: a.requiredTotal,
      scheduledTotal: a.scheduledTotal,
      unscheduled: a.unscheduled,
      entries: a.entries,
      warnings: a.warnings
    });
    setSaving(false);
    router.push(`/timetable/${res.timetableId}`);
  }

  const active = attempts[selected];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Generate Timetable</h1>
        <p className="text-sm text-slate-500">Configure scope, then run the automatic scheduling engine.</p>
      </div>

      <div className="card p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="label">Academic Session</label>
          <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Week starting (Monday)</label>
          <input type="date" className="input" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </div>
        <div>
          <label className="label">Course</label>
          <select className="input" value={courseId} onChange={(e) => { setCourseId(e.target.value); setBatchId(""); }}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Batch</label>
          <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">All batches</option>
            {filteredBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={handleGenerate} disabled={phase === "generating" || !sessionId}>
        {phase === "generating" ? "Generating..." : "Generate Timetable"}
      </button>

      {phase === "generating" && (
        <div className="card p-6 text-sm text-slate-600">
          Generating... Validating... Optimizing... Finalizing...
        </div>
      )}

      {phase === "done" && attempts.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-3">
            {attempts.map((a, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`card px-4 py-3 text-left ${selected === i ? "ring-2 ring-brand-500" : ""}`}
              >
                <div className="text-xs text-slate-500">Generation #{i + 1}</div>
                <div className="text-2xl font-semibold text-brand-700">{a.qualityScore}</div>
              </button>
            ))}
          </div>

          {active && (
            <div className="card p-5 space-y-3">
              {active.requiredTotal === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  No weekly subject requirements are configured for any batch, so there is nothing to schedule.
                  Go to <strong>Batches</strong> and add subject requirements (e.g. Physics × 5/week) before generating.
                </div>
              )}
              {active.warnings.length > 0 && active.requiredTotal > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 space-y-1">
                  {active.warnings.map((w, i) => <div key={i}>{w}</div>)}
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><div className="text-slate-500">Classes required</div><div className="text-lg font-semibold">{active.requiredTotal}</div></div>
                <div><div className="text-slate-500">Classes scheduled</div><div className="text-lg font-semibold">{active.scheduledTotal}</div></div>
                <div><div className="text-slate-500">Hard conflicts</div><div className="text-lg font-semibold">0</div></div>
                <div><div className="text-slate-500">Quality Score</div><div className="text-lg font-semibold">{active.qualityScore}/100</div></div>
              </div>

              {active.unscheduled.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <div className="font-medium text-amber-700 mb-2">Unable to fully schedule {active.unscheduled.length} requirement(s):</div>
                  <div className="space-y-2">
                    {active.unscheduled.map((u, i) => (
                      <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                        <div className="font-medium">{u.batchName} — {u.subjectName}</div>
                        <div className="text-slate-600">Required: {u.required} &nbsp; Scheduled: {u.scheduled}</div>
                        <ul className="list-disc list-inside text-slate-600 mt-1">
                          {u.reasons.map((r, ri) => <li key={ri}>{r}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save this timetable as Draft"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
