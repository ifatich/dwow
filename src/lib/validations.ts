import { z } from "zod";

// --- Shared ---
export const uuidSchema = z.string().uuid("ID harus UUID valid");

// --- Task ---
export const taskStatusEnum = z.enum(["todo", "in-progress", "review", "done"]);
export type TaskStatus = z.infer<typeof taskStatusEnum>;

export const createTaskSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  description: z.string().max(2000).optional().default(""),
  projectId: uuidSchema,
  leadId: uuidSchema,
  picName: z.string().min(1, "PIC wajib diisi").max(100),
  deadline: z.string().datetime().optional(),
  workloadHours: z.number().min(0).max(1000).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: taskStatusEnum.optional(),
  leadId: uuidSchema.optional(),
  picName: z.string().min(1).max(100).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

export const bulkTaskUpdateSchema = z.object({
  taskIds: z.array(uuidSchema).min(1, "Minimal 1 task").max(100),
  status: taskStatusEnum,
});

// --- Subtask ---
export const subtaskStatusEnum = z.enum(["to_do", "in_progress", "review", "done"]);
export type SubtaskStatus = z.infer<typeof subtaskStatusEnum>;

export const createSubtaskSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  description: z.string().max(2000).optional().default(""),
  taskId: uuidSchema,
  workloadHours: z.number().min(0.5, "Minimal 0.5 jam").max(100).optional().default(2),
  assigneeIds: z.array(uuidSchema).min(1, "Minimal 1 assignee").max(5).optional().default([]),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: subtaskStatusEnum.optional(),
  workloadHours: z.number().min(0.5).max(100).optional(),
});

export const bulkSubtaskUpdateSchema = z.object({
  subtaskIds: z.array(uuidSchema).min(1, "Minimal 1 subtask").max(100),
  status: subtaskStatusEnum,
});

// --- Revision ---
export const revisionNoteSchema = z.object({
  note: z.string().min(1, "Catatan revisi wajib diisi").max(2000),
});

// --- User ---
export const userRoleEnum = z.enum(["staff", "lead", "kadep", "super_admin"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const createUserSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi").max(100),
  username: z.string().min(3, "Username minimal 3 karakter").max(50).regex(/^[a-z0-9_]+$/, "Hanya huruf kecil, angka, dan underscore"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: userRoleEnum,
  department: z.string().max(100).optional().default(""),
  capacityHoursPerMonth: z.number().min(1, "Kapasitas minimal 1").max(744, "Maks 744 jam/bulan").optional().default(160),
});

export const updateUserSchema = z.object({
  nama: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(50).regex(/^[a-z0-9_]+$/).optional(),
  password: z.string().min(6).optional(),
  role: userRoleEnum.optional(),
  department: z.string().max(100).optional(),
  capacityHoursPerMonth: z.number().min(1).max(744).optional(),
});

// --- Auth ---
export const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

// --- Reports ---
export const reportQuerySchema = z.object({
  period: z.enum(["monthly", "quarterly"]).optional().default("monthly"),
});

// --- Settings ---
export const spreadsheetConfigSchema = z.object({
  spreadsheetId: z.string().min(1).max(200).optional(),
  appsScriptUrl: z.string().url("URL tidak valid").optional().or(z.literal("")),
  lastSyncAt: z.string().datetime().optional(),
  test: z.boolean().optional(),
});

// --- Activity Log ---
export const activityLogSchema = z.object({
  action: z.string().min(1).max(50),
  userId: uuidSchema,
  subtaskId: uuidSchema.optional(),
  taskId: uuidSchema.optional(),
  durationCategory: z.enum(["work", "wait_review"]).nullable().optional(),
  durationSeconds: z.number().min(0).optional(),
  note: z.string().max(2000).optional(),
});

// --- Helper: safe parse & return 400 ---
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}
