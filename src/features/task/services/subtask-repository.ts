import { eq, asc, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { subtasks, subtaskAssignees, activityLogs, timeContributions, users, staffAssignmentHistory } from "@/db/schema";
import type { Subtask, SubtaskStatus, ActivityLogEntry, StaffTimeContribution, StaffAssignmentHistoryLog } from "@/lib/types";

/**
 * Batch fetch subtasks for multiple task IDs in 4 total queries (eliminates N+1).
 */
export async function getSubtasksForTasks(taskIds: string[]): Promise<Map<string, Subtask[]>> {
  if (taskIds.length === 0) return new Map();

  // 1. Fetch all subtasks for these tasks
  const subRows = await db
    .select()
    .from(subtasks)
    .where(inArray(subtasks.taskId, taskIds));

  if (subRows.length === 0) return new Map();
  const subIds = subRows.map((s) => s.id);

  // 2. Fetch all assignees
  const assigneeRows = await db
    .select({ subtaskId: subtaskAssignees.subtaskId, username: users.username })
    .from(subtaskAssignees)
    .innerJoin(users, eq(subtaskAssignees.staffId, users.id))
    .where(inArray(subtaskAssignees.subtaskId, subIds))
    .orderBy(asc(subtaskAssignees.id));

  const assigneesBySub = new Map<string, string[]>();
  for (const r of assigneeRows) {
    const list = assigneesBySub.get(r.subtaskId) || [];
    list.push(r.username);
    assigneesBySub.set(r.subtaskId, list);
  }

  // 3. Fetch all activity logs
  const logRows = await db
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
    .where(inArray(activityLogs.subtaskId, subIds))
    .orderBy(asc(activityLogs.timestamp));

  const logsBySub = new Map<string, LogRow[]>();
  for (const r of logRows) {
    if (!r.subtaskId) continue;
    const list = logsBySub.get(r.subtaskId) || [];
    list.push({
      id: r.id,
      staffName: r.staffName,
      action: r.action,
      timestamp: r.timestamp,
      durationHours: r.durationHours,
      note: r.note,
    });
    logsBySub.set(r.subtaskId, list);
  }

  // 4. Fetch all time contributions
  const timeRows = await db
    .select({
      subtaskId: timeContributions.subtaskId,
      username: users.username,
      hours: timeContributions.hours,
    })
    .from(timeContributions)
    .innerJoin(users, eq(timeContributions.staffId, users.id))
    .where(inArray(timeContributions.subtaskId, subIds));

  const timeBySub = new Map<string, { username: string; hours: number }[]>();
  for (const r of timeRows) {
    const list = timeBySub.get(r.subtaskId) || [];
    list.push({ username: r.username, hours: r.hours });
    timeBySub.set(r.subtaskId, list);
  }

  // Map into Subtask objects
  const result = new Map<string, Subtask[]>();
  for (const sub of subRows) {
    const assignees = assigneesBySub.get(sub.id) || [];
    const logs = logsBySub.get(sub.id) || [];
    const rawTime = timeBySub.get(sub.id) || [];

    const assigneeSet = new Set(assignees.map((a) => a.toLowerCase()));
    const filteredTimeRows = rawTime.filter((r) => assigneeSet.has(r.username.toLowerCase()));

    const mapped = mapSubtask(sub, assignees, logs, filteredTimeRows);

    const taskList = result.get(sub.taskId) || [];
    taskList.push(mapped);
    result.set(sub.taskId, taskList);
  }

  return result;
}

/**
 * Get all subtasks for a task, with assignees and activity logs.
 */
export async function getSubtasksByTaskId(taskId: string): Promise<Subtask[]> {
  const rows = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId));

  return Promise.all(rows.map(async (sub) => {
    // Get assignees
    const assigneeRows = await db
      .select({ username: users.username })
      .from(subtaskAssignees)
      .innerJoin(users, eq(subtaskAssignees.staffId, users.id))
      .where(eq(subtaskAssignees.subtaskId, sub.id))
      .orderBy(asc(subtaskAssignees.id));

    const assignees = assigneeRows.map((r) => r.username);

    // Get activity logs with staff names
    const logRows = await db
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
      .where(eq(activityLogs.subtaskId, sub.id))
      .orderBy(asc(activityLogs.timestamp));

    // Get time contributions
    const timeRows = await db
      .select({
        username: users.username,
        hours: timeContributions.hours,
      })
      .from(timeContributions)
      .innerJoin(users, eq(timeContributions.staffId, users.id))
      .where(eq(timeContributions.subtaskId, sub.id));

    const assigneeSet = new Set(assignees.map((a) => a.toLowerCase()));
    const filteredTimeRows = timeRows.filter((r) => assigneeSet.has(r.username.toLowerCase()));

    return mapSubtask(sub, assignees, logRows, filteredTimeRows);
  }));
}

/**
 * Get a single subtask by ID.
 */
export async function getSubtaskById(subtaskId: string): Promise<Subtask | null> {
  const [sub] = await db
    .select()
    .from(subtasks)
    .where(eq(subtasks.id, subtaskId))
    .limit(1);

  if (!sub) return null;

  const assigneeRows = await db
    .select({ username: users.username })
    .from(subtaskAssignees)
    .innerJoin(users, eq(subtaskAssignees.staffId, users.id))
    .where(eq(subtaskAssignees.subtaskId, sub.id))
    .orderBy(asc(subtaskAssignees.id));

  return mapSubtask(
    sub,
    assigneeRows.map((r) => r.username),
    [],
    []
  );
}

/**
 * Create a new subtask.
 */
export async function createSubtask(data: {
  taskId: string;
  title: string;
  assignees: string[];
  workloadHours?: number;
  description?: string;
  goals?: string;
  dod?: string;
}): Promise<Subtask> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.insert(subtasks).values({
    id,
    taskId: data.taskId,
    title: data.title,
    description: data.description,
    goals: data.goals,
    dod: data.dod,
    done: false,
    status: "to_do",
    workloadHours: data.workloadHours || 0,
    createdAt: now,
    updatedAt: now,
  }).run();

  // Assign staff
  for (const username of data.assignees) {
    await addAssigneeByUsername(id, username);
  }

  return (await getSubtaskById(id))!;
}

/**
 * Update subtask fields (title, description, etc.).
 */
export async function updateSubtask(
  subtaskId: string,
  data: {
    title?: string;
    description?: string;
    goals?: string;
    dod?: string;
    evidence?: string;
    workloadHours?: number;
    assignees?: string[];
  }
): Promise<Subtask | null> {
  const now = new Date().toISOString();
  const updateData: any = { updatedAt: now };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.goals !== undefined) updateData.goals = data.goals;
  if (data.dod !== undefined) updateData.dod = data.dod;
  if (data.evidence !== undefined) updateData.evidence = data.evidence;
  if (data.workloadHours !== undefined) updateData.workloadHours = data.workloadHours;

  await db
    .update(subtasks)
    .set(updateData)
    .where(eq(subtasks.id, subtaskId))
    .run();

  return getSubtaskById(subtaskId);
}

/**
 * Update subtask status.
 */
export async function updateSubtaskStatus(
  subtaskId: string,
  newStatus: SubtaskStatus,
  userId?: string
): Promise<Subtask | null> {
  const now = new Date().toISOString();
  const updateData: any = { status: newStatus, updatedAt: now };

  if (newStatus === "done") {
    updateData.done = true;
  } else if (newStatus === "in_progress" || newStatus === "review") {
    updateData.done = false;
  }

  await db
    .update(subtasks)
    .set(updateData)
    .where(eq(subtasks.id, subtaskId))
    .run();

  return getSubtaskById(subtaskId);
}

/**
 * Add assignee to subtask.
 */
export async function addAssignee(subtaskId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.insert(subtaskAssignees).values({
    subtaskId,
    staffId: userId,
    assignedAt: now,
  }).run();
}

/**
 * Add assignee by username (resolves to user ID).
 */
async function addAssigneeByUsername(subtaskId: string, username: string): Promise<void> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (user) {
    await addAssignee(subtaskId, user.id);
  }
}

/**
 * Remove assignee from subtask.
 */
export async function removeAssignee(subtaskId: string, userId: string): Promise<void> {
  await db
    .delete(subtaskAssignees)
    .where(
      eq(subtaskAssignees.subtaskId, subtaskId) &&
      eq(subtaskAssignees.staffId, userId)
    )
    .run();
}

/**
 * Get total workload hours for all subtasks of a task.
 */
export async function getSubtaskTotalHours(taskId: string): Promise<number> {
  const rows = await db
    .select({ hours: subtasks.workloadHours })
    .from(subtasks)
    .where(eq(subtasks.taskId, taskId));

  return rows.reduce((sum, r) => sum + r.hours, 0);
}

interface LogRow {
  id: string;
  staffName: string | null;
  action: string;
  timestamp: string;
  durationHours: number;
  note: string | null;
}

/**
 * Map DB row to Subtask interface.
 */
function mapSubtask(
  s: typeof subtasks.$inferSelect,
  assignees: string[],
  logs: LogRow[],
  times: { username: string; hours: number }[]
): Subtask {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? undefined,
    goals: s.goals ?? undefined,
    dod: s.dod ?? undefined,
    evidence: s.evidence ?? undefined,
    done: s.done,
    status: s.status as SubtaskStatus,
    assignees,
    workloadHours: s.workloadHours,
    timeContributions: times.map((t) => ({
      staffName: t.username,
      hours: t.hours,
    })) as StaffTimeContribution[],
    activityLog: logs.map((l) => ({
      id: l.id,
      staffName: l.staffName || "",
      action: l.action as ActivityLogEntry["action"],
      timestamp: l.timestamp,
      durationHours: l.durationHours,
      note: l.note ?? undefined,
    })),
  };
}

function parseAssigneeList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const rec = item as Record<string, unknown>;
          if (typeof rec.name === "string" && rec.name.trim()) return rec.name;
          if (typeof rec.id === "string" && rec.id.trim()) return rec.id;
        }
        return String(item);
      })
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

/**
 * Fetch assignment history logs for a specific subtask.
 */
export async function getAssignmentHistoryForSubtask(subtaskId: string): Promise<StaffAssignmentHistoryLog[]> {
  const rows = await db
    .select()
    .from(staffAssignmentHistory)
    .where(eq(staffAssignmentHistory.subtaskId, subtaskId))
    .orderBy(desc(staffAssignmentHistory.createdAt));

  return rows.map((r) => ({
    id: r.id,
    subtaskId: r.subtaskId,
    previousAssignees: parseAssigneeList(r.previousAssignees),
    newAssignees: parseAssigneeList(r.newAssignees),
    changedBy: r.changedBy,
    changeType: r.changeType as StaffAssignmentHistoryLog["changeType"],
    reason: r.reason ?? undefined,
    createdAt: r.createdAt,
  }));
}

/**
 * Record a new assignment change in staffAssignmentHistory and update subtaskAssignees.
 */
export async function recordAssignmentHistory(data: {
  subtaskId: string;
  previousAssignees: string[];
  newAssignees: string[];
  changedBy: string;
  changeType: "added" | "removed" | "reassigned";
  reason?: string;
}): Promise<StaffAssignmentHistoryLog> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.insert(staffAssignmentHistory).values({
    id,
    subtaskId: data.subtaskId,
    previousAssignees: JSON.stringify(data.previousAssignees),
    newAssignees: JSON.stringify(data.newAssignees),
    changedBy: data.changedBy,
    changeType: data.changeType,
    reason: data.reason || null,
    createdAt,
  }).run();

  // Sinkronkan penugasan baru ke tabel subtaskAssignees
  if (data.newAssignees && data.newAssignees.length > 0) {
    const allUsers = await db
      .select({ id: users.id, username: users.username, nama: users.nama })
      .from(users);

    const matchedUserIds: string[] = [];
    for (const a of data.newAssignees) {
      if (!a) continue;
      const norm = a.toLowerCase().trim();
      const u = allUsers.find(
        (x) =>
          x.username.toLowerCase() === norm ||
          x.nama.toLowerCase() === norm ||
          x.id.toLowerCase() === norm
      );
      if (u && !matchedUserIds.includes(u.id)) {
        matchedUserIds.push(u.id);
      }
    }

    if (matchedUserIds.length > 0) {
      await db.delete(subtaskAssignees).where(eq(subtaskAssignees.subtaskId, data.subtaskId)).run();

      for (const staffId of matchedUserIds) {
        await db.insert(subtaskAssignees).values({
          subtaskId: data.subtaskId,
          staffId,
          assignedAt: createdAt,
        }).run();
      }
    }
  }

  return {
    id,
    subtaskId: data.subtaskId,
    previousAssignees: data.previousAssignees,
    newAssignees: data.newAssignees,
    changedBy: data.changedBy,
    changeType: data.changeType,
    reason: data.reason,
    createdAt,
  };
}

