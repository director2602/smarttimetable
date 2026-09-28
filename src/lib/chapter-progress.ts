import { db } from "@/db";
import { batchSubjectProgress, lectures } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Advances each batch/subject's stored chapter progress based on the lectures
 * actually used in a set of timetable entries. Only ever moves forward — never
 * rolls back progress that's already ahead.
 *
 * This must ONLY be called when a timetable is published, not when a draft is
 * saved. A single week can be generated and saved as a draft multiple times
 * while comparing quality scores; only the version that actually gets
 * published should consume chapters from the syllabus.
 */
export async function advanceChapterProgressForEntries(
  entries: { batchId: string; subjectId: string | null; lectureId: string | null }[]
) {
  const lectureIds = Array.from(new Set(entries.map((e) => e.lectureId).filter((id): id is string => !!id)));
  if (lectureIds.length === 0) return;

  const lecs = await db.query.lectures.findMany({ where: inArray(lectures.id, lectureIds) });
  const sortOrderByLectureId = new Map(lecs.map((l) => [l.id, l.sortOrder]));

  const maxSortOrderByKey = new Map<string, number>();
  for (const e of entries) {
    if (!e.lectureId || !e.subjectId) continue;
    const sortOrder = sortOrderByLectureId.get(e.lectureId);
    if (sortOrder == null) continue;
    const key = `${e.batchId}:${e.subjectId}`;
    const current = maxSortOrderByKey.get(key);
    if (current == null || sortOrder > current) maxSortOrderByKey.set(key, sortOrder);
  }

  for (const [key, sortOrder] of maxSortOrderByKey.entries()) {
    const [batchId, subjectId] = key.split(":");
    if (!batchId || !subjectId) continue;
    const existing = await db.query.batchSubjectProgress.findFirst({
      where: and(eq(batchSubjectProgress.batchId, batchId), eq(batchSubjectProgress.subjectId, subjectId))
    });
    if (existing) {
      if (sortOrder > existing.lastLectureSortOrder) {
        await db.update(batchSubjectProgress)
          .set({ lastLectureSortOrder: sortOrder, updatedAt: new Date().toISOString() })
          .where(eq(batchSubjectProgress.id, existing.id));
      }
    } else {
      await db.insert(batchSubjectProgress).values({ batchId, subjectId, lastLectureSortOrder: sortOrder });
    }
  }
}
