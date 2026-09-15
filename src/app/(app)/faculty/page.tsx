import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { faculty, facultySubjects, subjects, userPermissions, facultyAvailability, facultyBatches, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePermission, type Role } from "@/lib/permissions";
import FacultyRosterForm from "./faculty-roster-form";
import FacultyEditForm from "./faculty-edit-form";
import FacultyBatchAssignForm from "./faculty-batch-assign-form";
import { Fragment } from "react";

export default async function FacultyPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, fsRows, subjectRows, overrides, availRows, fbRows, batchRows] = await Promise.all([
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) }),
    db.query.facultySubjects.findMany(),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) }),
    db.query.facultyAvailability.findMany(),
    db.query.facultyBatches.findMany(),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) })
  ]);
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));
  const canEdit = resolvePermission(user.role as Role, overrides, "FACULTY_EDIT");
  const allBatches = batchRows.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Faculty</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Employee ID</th><th className="px-4 py-2">Subjects</th><th className="px-4 py-2">Max/day</th><th className="px-4 py-2">Max/week</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <Fragment key={f.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium">{f.name}</td>
                  <td className="px-4 py-2">{f.employeeId}</td>
                  <td className="px-4 py-2">{fsRows.filter((x) => x.facultyId === f.id).map((x) => subjById.get(x.subjectId)?.name).join(", ")}</td>
                  <td className="px-4 py-2">{f.maxClassesPerDay}</td>
                  <td className="px-4 py-2">{f.maxClassesPerWeek}</td>
                  <td className="px-4 py-2">{f.status}</td>
                  <td className="px-4 py-2 text-right">
                    <FacultyEditForm f={f} canEdit={canEdit} />
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td colSpan={7} className="px-4 pb-2 pt-1">
                    <FacultyBatchAssignForm
                      facultyId={f.id}
                      allBatches={allBatches}
                      assignedBatchIds={fbRows.filter((x) => x.facultyId === f.id).map((x) => x.batchId)}
                      canEdit={canEdit}
                    />
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td colSpan={7} className="px-4 pb-3 pt-1">
                    <FacultyRosterForm
                      facultyId={f.id}
                      availability={Object.fromEntries(
                        availRows.filter((a) => a.facultyId === f.id).map((a) => [a.dayOfWeek, a.available])
                      )}
                      canEdit={canEdit}
                    />
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
