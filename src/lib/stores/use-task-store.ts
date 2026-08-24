import { create } from "zustand";
import type { Task } from "@/lib/types";

interface TaskStore {
  /** Cache tasks keyed by projectId */
  tasksByProject: Record<string, Task[]>;
  setTasks: (projectId: string, tasks: Task[]) => void;
  updateTaskStatus: (taskId: string, newStatus: Task["status"]) => void;
  invalidateProject: (projectId: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasksByProject: {},

  setTasks: (projectId, tasks) =>
    set((s) => ({ tasksByProject: { ...s.tasksByProject, [projectId]: tasks } })),

  updateTaskStatus: (taskId, newStatus) =>
    set((s) => {
      const updated: Record<string, Task[]> = {};
      for (const [pid, tasks] of Object.entries(s.tasksByProject)) {
        updated[pid] = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      }
      return { tasksByProject: updated };
    }),

  invalidateProject: (projectId) =>
    set((s) => {
      const { [projectId]: _, ...rest } = s.tasksByProject;
      return { tasksByProject: rest };
    }),
}));
