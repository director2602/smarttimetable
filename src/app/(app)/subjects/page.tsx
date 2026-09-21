import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { subjects, userPermissions, lectures } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePermission, type Role } from "@/lib/permissions";
import { createSubject } from "./actions";
import SubjectEditForm from "./subject-edit-form";
import SubjectLecturesForm from "./subject-lectures-form";
import { Fragment } from "react";

export default async function SubjectsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, overrides, lectureRows] = await Promise.all([
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) }),
    db.query.lectures.findMany({ where: eq(lectures.organizationId, user.organizationId), orderBy: (l, { asc }) => asc(l.sortOrder) })
  ]);
  const canEdit = resolvePermission(user.role as Role, overrides, "SUBJECT_EDIT");
  const canDelete = resolvePermission(user.role as Role, overrides, "SUBJECT_DELETE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Subjects</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add chapters under a subject (e.g. PHY-0002 — Motion in a Plane) and the generator will automatically
          advance through them in order each time it schedules a class for that subject, instead of repeating the
          same chapter every lecture.
        </p>
      </div>
      <div className="card p-5">
        <form action={createSubject} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="name" required placeholder="e.g. Physics" className="input" />
          <input name="code" required placeholder="e.g. PHY" className="input" />
          <button className="btn-primary">Add Subject</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>{rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.code}</td>
                <td className="px-4 py-2 text-right"><SubjectEditForm subject={r} canEdit={canEdit} canDelete={canDelete} /></td>
              </tr>
              <tr className="bg-slate-50/50">
                <td colSpan={3} className="px-4 pb-3 pt-1">
                  <SubjectLecturesForm
                    subjectId={r.id}
                    chapters={lectureRows.filter((l) => l.subjectId === r.id).map((l) => ({ id: l.id, code: l.code, name: l.name }))}
                    canEdit={canEdit}
                  />
                </td>
              </tr>
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
