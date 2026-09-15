import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { instituteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const settings = await db.query.instituteSettings.findFirst({ where: eq(instituteSettings.organizationId, user.organizationId) });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="card p-5 max-w-lg space-y-3 text-sm">
        <div><span className="text-slate-500">Institute name:</span> <span className="font-medium">{settings?.instituteName}</span></div>
        <div><span className="text-slate-500">Timezone:</span> <span className="font-medium">{settings?.timezone}</span></div>
        <div><span className="text-slate-500">Organization:</span> <span className="font-medium">{user.organization?.name}</span></div>
      </div>
    </div>
  );
}
