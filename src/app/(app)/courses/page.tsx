import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { courses, userPermissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resolvePermission, type Role } from "@/lib/permissions";
import { createCourse } from "./actions";
import CourseEditForm from "./course-edit-form";
import { Fragment } from "react";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, overrides] = await Promise.all([
    db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) }),
    db.query.userPermissions.findMany({ where: eq(userPermissions.userId, user.id) })
  ]);
  const canEdit = resolvePermission(user.role as Role, overrides, "COURSE_EDIT");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Courses</h1>
      <div className="card p-5">
        <form action={createCourse} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="name" required placeholder="e.g. 11th JEE" className="input" />
          <input name="code" required placeholder="e.g. JEE-11" className="input" />
          <button className="btn-primary">Add Course</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>{rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.code}</td><td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2 text-right"><CourseEditForm course={r} canEdit={canEdit} /></td>
              </tr>
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
