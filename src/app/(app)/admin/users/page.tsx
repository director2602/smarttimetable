import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createUser } from "./actions";
import UserRowActions from "./user-row-actions";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.users.findMany({ where: eq(users.organizationId, user.organizationId) });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <div className="card p-5">
        <form action={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input name="name" required placeholder="Full name" className="input" />
          <input name="email" type="email" required placeholder="Email" className="input" />
          <select name="role" className="input">
            <option value="ADMIN">Admin</option>
            <option value="TIMETABLE_MANAGER">Timetable Manager</option>
            <option value="FACULTY">Faculty</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <input name="password" type="password" required minLength={8} placeholder="Temp password" className="input" />
          <button className="btn-primary">Add User</button>
        </form>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Role</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Last Login</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.status}</td>
                <td className="px-4 py-2">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</td>
                <td className="px-4 py-2 text-right">{u.role !== "OWNER" && <UserRowActions userId={u.id} status={u.status} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
