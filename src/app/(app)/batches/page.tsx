import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { batches, courses, batchSubjectRequirements, subjects, userPermissions, batchAvailability, batchTimeSlots, timeSlots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePermission, type Role } from "@/lib/permissions";
import BatchEditForm from "./batch-edit-form";
import BatchRosterForm from "./batch-roster-form";
import BatchShiftForm from "./batch-shift-form";
import BatchRequirementsForm from "./batch-requirements-form";
import BatchSlotSelectionForm from "./batch-slot-selection-form";

export default async function BatchesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, courseRows, reqRows, subjectRows, overrides, availRows, batchSlotRows, slotRows] = await Promise.all([
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) }),
    db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) }),
    db.query.batchSubjectRequirements.findMany(),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) }),
    db.query.batchAvailability.findMany(),
    db.query.batchTimeSlots.findMany(),
    db.query.timeSlots.findMany({ where: eq(timeSlots.organizationId, user.organizationId), orderBy: (t, { asc }) => asc(t.sortOrder) })
  ]);
  const courseById = new Map(courseRows.map((c) => [c.id, c]));
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const canEdit = resolvePermission(user.role as Role, overrides, "BATCH_EDIT");
  const canDelete = resolvePermission(user.role as Role, overrides, "BATCH_DELETE");
  const allSubjects = subjectRows.map((s) => ({ id: s.id, name: s.name }));
  const classSlots = slotRows.filter((s) => s.type === "CLASS");
  const allSlotOptions = classSlots.map((s) => ({ id: s.id, label: `${s.startTime}-${s.endTime}` }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Batches</h1>
        <p className="text-sm text-slate-500">{rows.length} batches</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((b) => {
          const reqs = reqRows.filter((r) => r.batchId === b.id).map((r) => ({
            subjectId: r.subjectId, subjectName: subjById.get(r.subjectId)?.name || "Unknown", classesPerWeek: r.classesPerWeek
          }));
          return (
            <div key={b.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-slate-500">{courseById.get(b.courseId)?.name}</div>
                </div>
                <div className="text-xs text-slate-500">{b.studentCount} students</div>
              </div>
              <BatchRequirementsForm batchId={b.id} requirements={reqs} allSubjects={allSubjects} canEdit={canEdit} />
              <div className="mt-2">
                <BatchEditForm batch={b} canEdit={canEdit} canDelete={canDelete} />
              </div>
              <BatchShiftForm batchId={b.id} currentShift={b.shift as "NONE" | "MORNING" | "EVENING"} canEdit={canEdit} />
              <BatchRosterForm
                batchId={b.id}
                availability={Object.fromEntries(
                  availRows.filter((a) => a.batchId === b.id).map((a) => [a.dayOfWeek, a.available])
                )}
                canEdit={canEdit}
              />
              <div className="mt-2">
                <BatchSlotSelectionForm
                  batchId={b.id}
                  allSlots={allSlotOptions}
                  selectedSlotIds={batchSlotRows.filter((s) => s.batchId === b.id).map((s) => s.timeSlotId)}
                  canEdit={canEdit}
                />
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-slate-400 text-sm">No batches yet. Run the seed script or add courses first.</p>}
      </div>
    </div>
  );
}
