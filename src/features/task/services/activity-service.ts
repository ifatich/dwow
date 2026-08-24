import { db } from "@/db";
import { activityLogs, users, subtasks, tasks } from "@/db/schema";
import { desc, asc, eq, and, like, or } from "drizzle-orm";

type LogAction =
  | "created" | "started" | "paused" | "resumed" | "completed"
  | "review_requested" | "approved" | "revision_requested"
  | "task_created" | "task_status_changed" | "task_rejected" | "task_approved"
  | "subtask_created" | "assignee_added" | "assignee_removed";

/**
 * Mencatat aktivitas pada subtask ke database.
 * Resolve userId dari username via DB.
 */
export async function logSubtaskActivity(
  subtaskId: string,
  staffName: string,
  action: LogAction,
  note?: string,
  durationCategory?: "work" | "wait_review",
  durationSeconds?: number,
  taskId?: string
): Promise<string | null> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Resolve userId dari username
    const userId = await resolveUserId(staffName);

    // Resolve taskId jika tidak disediakan
    let resolvedTaskId = taskId;
    if (!resolvedTaskId) {
      const [sub] = await db.select({ taskId: subtasks.taskId })
        .from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1);
      resolvedTaskId = sub?.taskId ?? undefined;
    }

    await db.insert(activityLogs).values({
      id,
      subtaskId,
      taskId: resolvedTaskId ?? null,
      userId: userId ?? null,
      action,
      timestamp: now,
      durationHours: durationSeconds ? Math.round((durationSeconds / 3600) * 10) / 10 : 0,
      durationCategory: durationCategory ?? null,
      durationSeconds: durationSeconds ?? null,
      note: note ?? null,
    }).run();

    return id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Gagal menyimpan activity log ke database:", message);
    return null;
  }
}

/**
 * Mencatat aktivitas pada task (task-level log, tanpa subtask).
 */
export async function logTaskActivity(
  taskId: string,
  staffName: string,
  action: LogAction,
  note?: string,
): Promise<string | null> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const userId = await resolveUserId(staffName);

    await db.insert(activityLogs).values({
      id,
      subtaskId: null,
      taskId,
      userId: userId ?? null,
      action,
      timestamp: now,
      durationHours: 0,
      durationCategory: null,
      durationSeconds: null,
      note: note ?? null,
    }).run();

    return id;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Gagal menyimpan task activity log ke database:", message);
    return null;
  }
}

/**
 * Mengambil semua aktivitas dari database untuk sebuah subtask.
 */
export async function getSubtaskActivityLog(subtaskId: string) {
  return db
    .select({
      id: activityLogs.id,
      subtaskId: activityLogs.subtaskId,
      taskId: activityLogs.taskId,
      userId: activityLogs.userId,
      staffName: users.username,
      staffNama: users.nama,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      durationHours: activityLogs.durationHours,
      durationCategory: activityLogs.durationCategory,
      durationSeconds: activityLogs.durationSeconds,
      note: activityLogs.note,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.subtaskId, subtaskId))
    .orderBy(asc(activityLogs.timestamp));
}

/**
 * Mengambil semua aktivitas yang dilakukan oleh staff tertentu.
 */
export async function getStaffActivityLog(staffName: string) {
  // Resolve userId terlebih dahulu
  const userId = await resolveUserId(staffName);
  if (!userId) return [];

  return db
    .select({
      id: activityLogs.id,
      subtaskId: activityLogs.subtaskId,
      taskId: activityLogs.taskId,
      userId: activityLogs.userId,
      staffName: users.username,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      durationHours: activityLogs.durationHours,
      durationCategory: activityLogs.durationCategory,
      durationSeconds: activityLogs.durationSeconds,
      note: activityLogs.note,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, userId))
    .orderBy(desc(activityLogs.timestamp));
}

/**
 * Mengambil semua activity logs (untuk halaman riwayat).
 * Joined dengan users, subtasks, tasks untuk mendapat nama.
 */
export async function getAllActivityLogs(options?: {
  action?: string;
  search?: string;
  limit?: number;
}) {
  const rows = await db
    .select({
      id: activityLogs.id,
      subtaskId: activityLogs.subtaskId,
      taskId: activityLogs.taskId,
      userId: activityLogs.userId,
      staffName: users.username,
      staffNama: users.nama,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      durationHours: activityLogs.durationHours,
      note: activityLogs.note,
      subtaskTitle: subtasks.title,
      taskTitle: tasks.title,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .leftJoin(subtasks, eq(activityLogs.subtaskId, subtasks.id))
    .leftJoin(tasks, eq(activityLogs.taskId, tasks.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(options?.limit ?? 500);

  let result = rows;

  // Filter by action
  if (options?.action && options.action !== "all") {
    result = result.filter((r) => r.action === options.action);
  }

  // Filter by search (staff name, task title, subtask title, note)
  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter((r) =>
      (r.staffName && r.staffName.toLowerCase().includes(q)) ||
      (r.staffNama && r.staffNama.toLowerCase().includes(q)) ||
      (r.taskTitle && r.taskTitle.toLowerCase().includes(q)) ||
      (r.subtaskTitle && r.subtaskTitle.toLowerCase().includes(q)) ||
      (r.note && r.note.toLowerCase().includes(q))
    );
  }

  return result;
}

/**
 * Resolve username ke user ID dari database.
 */
async function resolveUserId(username: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);

  return user?.id ?? null;
}
