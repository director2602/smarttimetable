"use server";
import { requirePermission } from "@/lib/auth";
import { runBulkImport } from "@/lib/bulk-import-core";

export async function bulkImportAndGenerate(formData: FormData) {
  const user = await requirePermission("SETTINGS_EDIT");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("No file uploaded");

  const buffer = Buffer.from(await file.arrayBuffer());
  return runBulkImport(user.organizationId, user.id, buffer);
}
