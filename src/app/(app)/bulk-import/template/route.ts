import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const wb = XLSX.utils.book_new();

  const instructions = XLSX.utils.aoa_to_sheet([
    ["S-CUBUS SmartTimetable — One-Time Bulk Setup"],
    [""],
    ["Fill in as many of the sheets below as you need, then upload this file on the Bulk Import page."],
    ["When you upload, the system will create/update everything in the right order, then automatically"],
    ["generate a draft timetable for the next working week."],
    [""],
    ["Sheet order matters for references (e.g. Batches refer to Courses by name) — fill Courses and"],
    ["Subjects before Batches, and fill Subjects and Batches before Faculty."],
    [""],
    ["You can leave any sheet empty if you don't need it, or if that data already exists in the system —"],
    ["existing records are matched by name/code and updated rather than duplicated."],
    [""],
    ["Time format: use 24-hour HH:MM, e.g. 08:00, 14:30."],
    ["Date format: use YYYY-MM-DD, e.g. 2026-10-02."],
    ["Subject Requirements format (Batches sheet): \"Physics:5, Chemistry:5, Mathematics:6\" (subject:classes-per-week, comma-separated)."],
    ["Subjects / Batches format (Faculty sheet): comma-separated exact names, e.g. \"Physics, Chemistry\"."]
  ]);
  instructions["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, instructions, "Read Me First");

  const coursesWs = XLSX.utils.json_to_sheet([{ "Name": "11th JEE", "Code": "JEE-11" }]);
  XLSX.utils.book_append_sheet(wb, coursesWs, "Courses");

  const subjectsWs = XLSX.utils.json_to_sheet([{ "Name": "Physics", "Code": "PHY" }]);
  XLSX.utils.book_append_sheet(wb, subjectsWs, "Subjects");

  const roomsWs = XLSX.utils.json_to_sheet([{ "Name": "Room 101", "Code": "R101", "Capacity": 50, "Type": "CLASSROOM", "Building": "" }]);
  XLSX.utils.book_append_sheet(wb, roomsWs, "Rooms");

  const slotsWs = XLSX.utils.json_to_sheet([{ "Start": "08:00", "End": "09:00", "Type": "CLASS" }]);
  XLSX.utils.book_append_sheet(wb, slotsWs, "TimeSlots");

  const holidaysWs = XLSX.utils.json_to_sheet([{ "Date": "2026-10-02", "Name": "Gandhi Jayanti" }]);
  XLSX.utils.book_append_sheet(wb, holidaysWs, "Holidays");

  const batchesWs = XLSX.utils.json_to_sheet([{
    "Course": "11th JEE", "Batch Name": "JEE-11-A", "Batch Code": "JEE-11-A", "Student Count": 45,
    "Max Per Day": 6, "Max Consecutive": 3, "Subject Requirements": "Physics:5, Chemistry:5, Mathematics:6"
  }]);
  XLSX.utils.book_append_sheet(wb, batchesWs, "Batches");

  const facultyWs = XLSX.utils.json_to_sheet([{
    "Name": "Rahul Sharma", "Employee ID": "F001", "Email": "", "Phone": "",
    "Subjects": "Physics", "Batches": "JEE-11-A", "Max Per Day": 6, "Max Per Week": 30
  }]);
  XLSX.utils.book_append_sheet(wb, facultyWs, "Faculty");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="smarttimetable-bulk-setup-template.xlsx"`
    }
  });
}
