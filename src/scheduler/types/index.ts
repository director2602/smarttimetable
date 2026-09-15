export interface SlotDef {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string;
  type: "CLASS" | "BREAK";
  sortOrder: number;
}

export interface DateSlot {
  date: string; // ISO date
  dayOfWeek: number; // 0=Sun..6=Sat
  slot: SlotDef;
}

export interface FacultyDef {
  id: string;
  name: string;
  subjectIds: string[];
  batchIds: string[]; // which batches they're allowed to teach (from facultyBatches)
  maxClassesPerDay: number;
  maxClassesPerWeek: number;
  availability: Map<number, { available: boolean; startTime?: string; endTime?: string }>;
  blockedSlots: { date?: string; dayOfWeek?: number; startTime: string; endTime: string }[];
}

export interface RoomDef {
  id: string;
  name: string;
  capacity: number;
  availability: Map<number, { available: boolean; startTime?: string; endTime?: string }>;
  blockedSlots: { date?: string; dayOfWeek?: number; startTime: string; endTime: string }[];
}

export interface BatchDef {
  id: string;
  name: string;
  studentCount: number;
  maxClassesPerDay: number;
  maxConsecutiveClasses: number;
  availability: Map<number, { available: boolean; startTime?: string; endTime?: string }>;
}

export interface RequirementJob {
  id: string; // batchId:subjectId
  batchId: string;
  subjectId: string;
  subjectName: string;
  classesPerWeek: number;
  minGapDays: number;
  eligibleFacultyIds: string[];
}

export interface SchedulerInput {
  weekStartDate: string; // ISO Monday (or first working day)
  dateSlots: DateSlot[]; // all candidate (date, slot) pairs for the week, CLASS type only
  batches: BatchDef[];
  faculty: FacultyDef[];
  rooms: RoomDef[];
  requirements: RequirementJob[];
}

export interface PlacedEntry {
  batchId: string;
  subjectId: string;
  facultyId: string;
  roomId: string;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface UnscheduledReason {
  batchId: string;
  batchName: string;
  subjectId: string;
  subjectName: string;
  required: number;
  scheduled: number;
  reasons: string[];
}

export interface SchedulerResult {
  entries: PlacedEntry[];
  requiredTotal: number;
  scheduledTotal: number;
  unscheduled: UnscheduledReason[];
  qualityScore: number;
  warnings: string[];
}
