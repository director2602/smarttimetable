import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { faculty, facultySubjects, subjects } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function FacultyPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [rows, fsRows, subjectRows] = await Promise.all([
    db.query.faculty.findMany({ where: eq(faculty.organizationId, user.organizationId) }),
    db.query.facultySubjects.findMany(),
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) })
  ]);
  const subjById = new Map(subjectRows.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Faculty</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Employee ID</th><th className="px-4 py-2">Subjects</th><th className="px-4 py-2">Max/day</th><th className="px-4 py-2">Max/week</th><th className="px-4 py-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{f.name}</td>
                <td className="px-4 py-2">{f.employeeId}</td>
                <td className="px-4 py-2">{fsRows.filter((x) => x.facultyId === f.id).map((x) => subjById.get(x.subjectId)?.name).join(", ")}</td>
                <td className="px-4 py-2">{f.maxClassesPerDay}</td>
                <td className="px-4 py-2">{f.maxClassesPerWeek}</td>
                <td className="px-4 py-2">{f.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
