import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Tabel: users
 * Data pengguna aplikasi — staff, lead, kadep, super_admin.
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  nama: text("nama").notNull(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["staff", "lead", "kadep", "kadiv", "super_admin"] }).notNull().default("staff"),
  department: text("department"),
  capacityHoursPerMonth: real("capacity_hours_per_month").notNull().default(72),
  leaveDays: real("leave_days").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Tabel: lead_staff_assignments
 * Relasi Many-to-Many antara Lead dan Staff (Matrix Team Structure)
 */
export const leadStaffAssignments = sqliteTable("lead_staff_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: text("lead_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  staffId: text("staff_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: text("assigned_at").notNull(),
});

/**
 * Tabel: project_categories
 * Master Data Kategori Project — menyimpan daftar kategori, kode tiket, dan default lead penanggung jawab.
 */
export const projectCategories = sqliteTable("project_categories", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull().unique(), // e.g. "Pooling IT", "Digital Project"
  code: text("code").notNull(), // e.g. "POOL", "DIGI"
  leadId: text("lead_id").references(() => users.id),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Tabel: projects
 * Data proyek — setiap proyek punya lead dan sprint.
 */
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(), // UUID
  title: text("title").notNull(),
  description: text("description"),
  goals: text("goals"),
  dod: text("dod"),
  sprint: text("sprint").notNull(),
  leadId: text("lead_id").references(() => users.id),
  sprintCutoff: text("sprint_cutoff"), // ISO 8601, nullable
  isArchived: integer("is_archived", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Tabel: revision_notes
 * Menyimpan catatan revisi permanen saat Lead menolak/merevisi subtask.
 * Setiap catatan terikat ke subtask dan dicatat oleh Lead.
 */
export const revisionNotes = sqliteTable("revision_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subtaskId: text("subtask_id").notNull(),
  taskId: text("task_id").notNull(),
  leadId: text("lead_id").references(() => users.id),
  note: text("note").notNull(),
  action: text("action", { enum: ["rejected", "revision_requested"] }).notNull().default("rejected"),
  createdAt: text("created_at").notNull(), // ISO 8601
  updatedAt: text("updated_at").notNull(), // ISO 8601
});

/**
 * Tabel: tasks
 * Data task proyek — setiap task punya subtask, lead, dan project.
 */
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  goals: text("goals"),
  dod: text("dod"),
  status: text("status", { enum: ["todo", "in-progress", "review", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  picName: text("pic_name").notNull(),
  leadId: text("lead_id").references(() => users.id),
  projectId: text("project_id").references(() => projects.id),
  totalActualHours: real("total_actual_hours").default(0),
  deadline: text("deadline"), // ISO 8601
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Tabel: subtasks
 */
export const subtasks = sqliteTable("subtasks", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  goals: text("goals"),
  dod: text("dod"),
  evidence: text("evidence"),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["to_do", "in_progress", "review", "done"] }).notNull().default("to_do"),
  workloadHours: real("workload_hours").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Tabel: subtask_assignees (many-to-many)
 */
export const subtaskAssignees = sqliteTable("subtask_assignees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subtaskId: text("subtask_id").notNull().references(() => subtasks.id, { onDelete: "cascade" }),
  staffId: text("staff_id").references(() => users.id),
  assignedAt: text("assigned_at").notNull(),
});

/**
 * Tabel: activity_logs
 */
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  subtaskId: text("subtask_id").references(() => subtasks.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => tasks.id),
  userId: text("user_id").references(() => users.id),
  action: text("action", {
    enum: [
      "created", "started", "paused", "resumed", "completed",
      "review_requested", "approved", "revision_requested",
      "task_created", "task_status_changed", "task_rejected", "task_approved",
      "subtask_created", "assignee_added", "assignee_removed",
    ],
  }).notNull(),
  timestamp: text("timestamp").notNull(),
  durationHours: real("duration_hours").notNull().default(0),
  durationCategory: text("duration_category", { enum: ["work", "wait_review"] }),
  durationSeconds: integer("duration_seconds"),
  note: text("note"),
});

/**
 * Tabel: time_contributions
 */
export const timeContributions = sqliteTable("time_contributions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subtaskId: text("subtask_id").notNull().references(() => subtasks.id, { onDelete: "cascade" }),
  staffId: text("staff_id").references(() => users.id),
  hours: real("hours").notNull().default(0),
});

/**
 * Tabel: staff_assignment_history
 */
export const staffAssignmentHistory = sqliteTable("staff_assignment_history", {
  id: text("id").primaryKey(),
  subtaskId: text("subtask_id").notNull().references(() => subtasks.id, { onDelete: "cascade" }),
  previousAssignees: text("previous_assignees"),
  newAssignees: text("new_assignees").notNull(),
  changedBy: text("changed_by").notNull(),
  changeType: text("change_type", { enum: ["added", "removed", "reassigned"] }).notNull().default("reassigned"),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});

