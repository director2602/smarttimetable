export const PERMISSIONS = [
  "COURSE_VIEW", "COURSE_CREATE", "COURSE_EDIT", "COURSE_DELETE",
  "BATCH_VIEW", "BATCH_CREATE", "BATCH_EDIT", "BATCH_DELETE",
  "SUBJECT_VIEW", "SUBJECT_CREATE", "SUBJECT_EDIT", "SUBJECT_DELETE",
  "FACULTY_VIEW", "FACULTY_CREATE", "FACULTY_EDIT", "FACULTY_DELETE",
  "ROOM_VIEW", "ROOM_CREATE", "ROOM_EDIT", "ROOM_DELETE",
  "TIMETABLE_VIEW", "TIMETABLE_CREATE", "TIMETABLE_EDIT", "TIMETABLE_GENERATE", "TIMETABLE_PUBLISH", "TIMETABLE_DELETE",
  "PDF_GENERATE", "EXCEL_EXPORT",
  "USER_VIEW", "USER_CREATE", "USER_EDIT", "USER_DEACTIVATE", "USER_DELETE",
  "SETTINGS_VIEW", "SETTINGS_EDIT",
  "AUDIT_VIEW"
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "OWNER" | "ADMIN" | "TIMETABLE_MANAGER" | "FACULTY" | "VIEWER";

// Default permission set per role. Owner always gets everything regardless of this map.
const VIEW_ONLY: Permission[] = PERMISSIONS.filter((p) => p.endsWith("_VIEW"));

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: PERMISSIONS.filter((p) => p !== "USER_DELETE"),
  TIMETABLE_MANAGER: [
    "COURSE_VIEW", "BATCH_VIEW", "SUBJECT_VIEW", "FACULTY_VIEW", "ROOM_VIEW",
    "TIMETABLE_VIEW", "TIMETABLE_CREATE", "TIMETABLE_EDIT", "TIMETABLE_GENERATE", "TIMETABLE_PUBLISH",
    "PDF_GENERATE", "EXCEL_EXPORT"
  ],
  FACULTY: ["TIMETABLE_VIEW", "COURSE_VIEW", "BATCH_VIEW", "ROOM_VIEW"],
  VIEWER: VIEW_ONLY
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  if (role === "OWNER") return true;
  return ROLE_DEFAULT_PERMISSIONS[role].includes(permission);
}

/**
 * Server-side permission check. Combines role defaults with any per-user
 * overrides stored in user_permissions (allow: false revokes, allow: true grants
 * an extra permission beyond the role default).
 */
export function resolvePermission(
  role: Role,
  overrides: { permissionKey: string; allow: boolean }[],
  permission: Permission
): boolean {
  const override = overrides.find((o) => o.permissionKey === permission);
  if (override) return override.allow;
  return roleHasPermission(role, permission);
}
