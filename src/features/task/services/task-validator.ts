import type { Task, Subtask } from "@/lib/types";
import { getTaskById } from "./task-repository";
import { updateTaskStatus } from "./task-repository";

export interface TaskValidationResult {
  valid: boolean;
  taskId: string;
  taskTitle: string;
  totalSubtasks: number;
  doneSubtasks: number;
  pendingSubtasks: { id: string; title: string; status: Subtask["status"] }[];
}

/**
 * Memvalidasi apakah semua subtask dari suatu task sudah selesai ("done").
 * Task hanya bisa dipindahkan ke "done" jika semua subtask done.
 */
export async function validateAllSubtasksDone(taskId: string): Promise<TaskValidationResult | null> {
  const task = await getTaskById(taskId);
  if (!task) return null;

  const totalSubtasks = task.subtasks.length;
  const doneSubtasks = task.subtasks.filter((s) => s.status === "done").length;
  const pendingSubtasks = task.subtasks
    .filter((s) => s.status !== "done")
    .map((s) => ({ id: s.id, title: s.title, status: s.status }));

  return {
    valid: pendingSubtasks.length === 0,
    taskId: task.id,
    taskTitle: task.title,
    totalSubtasks,
    doneSubtasks,
    pendingSubtasks,
  };
}

/**
 * Memindahkan task ke status "done" jika semua subtask selesai.
 * Return null jika validasi gagal.
 */
export async function completeTaskIfValid(taskId: string): Promise<{ task: Task; validation: TaskValidationResult } | { error: string; validation: TaskValidationResult }> {
  const validation = await validateAllSubtasksDone(taskId);
  if (!validation) return { error: "Task tidak ditemukan", validation: { valid: false, taskId, taskTitle: "", totalSubtasks: 0, doneSubtasks: 0, pendingSubtasks: [] } };
  if (!validation.valid) return { error: `${validation.pendingSubtasks.length} subtask belum selesai`, validation };

  const task = await updateTaskStatus(taskId, "done");
  if (!task) return { error: "Gagal update task status", validation };

  return { task, validation };
}
