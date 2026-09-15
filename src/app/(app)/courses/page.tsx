import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCourse } from "./actions";

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) });
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
          <thead className="bg-slate-50 text-left text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Code</th><th className="px-4 py-2">Status</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t border-slate-100"><td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.code}</td><td className="px-4 py-2">{r.status}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
