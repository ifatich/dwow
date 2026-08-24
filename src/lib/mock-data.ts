import type { TaskStatus, SubtaskStatus } from "./types";

/**
 * Kolom kanban untuk Task Board — 3 kolom.
 */
export const TASK_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

/**
 * Kolom kanban untuk Subtask Board — 4 kolom.
 */
export const SUBTASK_COLUMNS: { id: SubtaskStatus; title: string }[] = [
  { id: "to_do", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

/** Legacy — keep for backward compat */
export const COLUMNS = TASK_COLUMNS;
