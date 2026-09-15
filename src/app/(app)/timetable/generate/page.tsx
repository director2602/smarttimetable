import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { academicSessions, courses, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import GenerateClient from "./generate-client";

export default async function GeneratePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [sessions, courseList, batchList] = await Promise.all([
    db.query.academicSessions.findMany({ where: eq(academicSessions.organizationId, user.organizationId) }),
    db.query.courses.findMany({ where: eq(courses.organizationId, user.organizationId) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) })
  ]);

  return (
    <GenerateClient
      sessions={sessions.map((s) => ({ id: s.id, name: s.name }))}
      courses={courseList.map((c) => ({ id: c.id, name: c.name }))}
      batches={batchList.map((b) => ({ id: b.id, name: b.name, courseId: b.courseId }))}
    />
  );
}
