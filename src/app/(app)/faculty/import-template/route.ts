import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { subjects, batches } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [subjectRows, batchRows] = await Promise.all([
    db.query.subjects.findMany({ where: eq(subjects.organizationId, user.organizationId) }),
    db.query.batches.findMany({ where: eq(batches.organizationId, user.organizationId) })
  ]);

  const sampleRow = {
    "Name": "Rahul Sharma",
    "Employee ID": "F001",
    "Email": "rahul.sharma@example.com",
    "Phone": "9876543210",
    "Subjects": subjectRows.slice(0, 2).map((s) => s.name).join(", ") || "Physics, Chemistry",
    "Batches": batchRows.slice(0, 2).map((b) => b.name).join(", ") || "JEE-11-A, JEE-11-B",
    "Max Per Day": 6,
    "Max Per Week": 30
  };

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([sampleRow]);
  ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Faculty Import");

  const refSheetData = [
    ["Existing subjects in your institute (use exact name in the Subjects column):"],
    ...subjectRows.map((s) => [s.name]),
    [],
    ["Existing batches in your institute (use exact name in the Batches column):"],
    ...batchRows.map((b) => [b.name])
  ];
  const refWs = XLSX.utils.aoa_to_sheet(refSheetData);
  XLSX.utils.book_append_sheet(wb, refWs, "Reference (Subjects & Batches)");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="faculty-import-template.xlsx"`
    }
  });
}
