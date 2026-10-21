import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";
import type { Task, TaskStatus } from "@/lib/types";
import { getSubtasksByTaskId, getSubtasksForTasks } from "./subtask-repository";
import { generateTicketId } from "./ticket-generator";

/**
 * Get all tasks for a project, with subtasks and assignees.
 */
export async function getTasksByProject(projectId: string): Promise<Task[]> {
  const decodedId = decodeURIComponent(projectId);

  // Find project by id or title
  const [proj] = await db
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(or(eq(projects.id, projectId), eq(projects.title, decodedId), eq(projects.id, decodedId)))
    .limit(1);

  const targetProjectId = proj?.id || projectId;

  // Pre-load all users for PIC and Lead avatar lookup
  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      nama: users.nama,
      avatar: users.avatar,
    })
    .from(users);

  const userAvatarMap = new Map<string, string | null>();
  for (const u of allUsers) {
    if (u.username) userAvatarMap.set(u.username.trim().toLowerCase(), u.avatar || null);
    if (u.nama) userAvatarMap.set(u.nama.trim().toLowerCase(), u.avatar || null);
  }

  const rows = await db
    .select({
      task: tasks,
      leadUsername: users.username,
      leadNama: users.nama,
      leadAvatar: users.avatar,
      projectTitle: projects.title,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.leadId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.projectId, targetProjectId));

  if (rows.length === 0) return [];

  const taskIds = rows.map((r) => r.task.id);
  const subtasksMap = await getSubtasksForTasks(taskIds);

  return rows.map((row) => {
    const subtasks = subtasksMap.get(row.task.id) || [];
    const picAvatar = userAvatarMap.get(row.task.picName.trim().toLowerCase()) || null;
    return mapTask(
      row.task,
      row.leadUsername || "",
      row.projectTitle || "",
      subtasks,
      row.leadAvatar || null,
      picAvatar
    );
  });
}

/**
 * Get a single task by ID with all subtasks.
 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const [row] = await db
    .select({
      task: tasks,
      leadUsername: users.username,
      leadNama: users.nama,
      leadAvatar: users.avatar,
      projectTitle: projects.title,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.leadId, users.id))
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!row) return null;

  const [picUser] = await db
    .select({ avatar: users.avatar })
    .from(users)
    .where(or(eq(users.username, row.task.picName), eq(users.nama, row.task.picName)))
    .limit(1);

  const subtasks = await getSubtasksByTaskId(row.task.id);
  return mapTask(
    row.task,
    row.leadUsername || "",
    row.projectTitle || "",
    subtasks,
    row.leadAvatar || null,
    picUser?.avatar || null
  );
}

/**
 * Create a new task.
 */
export async function createTask(data: {
  title: string;
  description?: string;
  goals?: string;
  dod?: string;
  priority?: string;
  picName: string;
  leadId: string;
  projectId: string;
  deadline?: string;
}): Promise<Task> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  // Generate ticket ID
  const ticketId = await generateTicketId(data.projectId, data.picName, data.leadId);

  await db.insert(tasks).values({
    id,
    ticketId,
    title: data.title,
    description: data.description,
    goals: data.goals,
    dod: data.dod,
    status: "todo",
    priority: (data.priority as any) || "medium",
    picName: data.picName,
    leadId: data.leadId,
    projectId: data.projectId,
    deadline: data.deadline,
    totalActualHours: 0,
    createdAt: now,
    updatedAt: now,
  }).run();

  return (await getTaskById(id))!;
}

/**
 * Update task status.
 */
export async function updateTaskStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<Task | null> {
  const now = new Date().toISOString();
  await db
    .update(tasks)
    .set({ status: newStatus, updatedAt: now })
    .where(eq(tasks.id, taskId))
    .run();

  return getTaskById(taskId);
}

/**
 * Reassign task lead.
 */
export async function updateTaskLead(
  taskId: string,
  leadId: string
): Promise<Task | null> {
  const now = new Date().toISOString();
  await db
    .update(tasks)
    .set({ leadId, updatedAt: now })
    .where(eq(tasks.id, taskId))
    .run();

  return getTaskById(taskId);
}

/**
 * Map DB task row to Task interface.
 */
function mapTask(
  t: typeof tasks.$inferSelect,
  leadName: string,
  projectName: string,
  subtasks: Task["subtasks"],
  leadAvatar?: string | null,
  picAvatar?: string | null
): Task {
  return {
    id: t.id,
    ticketId: t.ticketId,
    title: t.title,
    description: t.description ?? undefined,
    goals: t.goals ?? undefined,
    dod: t.dod ?? undefined,
    status: t.status as TaskStatus,
    priority: t.priority as Task["priority"],
    picName: t.picName,
    picAvatar: picAvatar ?? null,
    lead: leadName,
    leadAvatar: leadAvatar ?? null,
    project: projectName,
    projectId: t.projectId || "",
    subtasks,
    deadline: t.deadline || "",
  };
}
