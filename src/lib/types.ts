export type TaskStatus = "todo" | "in-progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type SubtaskStatus = "to_do" | "in_progress" | "review" | "done";

export interface StaffTimeContribution {
  staffName: string;
  hours: number;
}

export interface ActivityLogEntry {
  id: string;
  staffName: string;
  action: "created" | "started" | "paused" | "resumed" | "completed" | "review_requested" | "approved" | "revision_requested";
  timestamp: string; // ISO date string
  durationHours: number; // accumulated hours at this point
  note?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  goals?: string;
  dod?: string;
  evidence?: string;
  done: boolean;
  status: SubtaskStatus;
  assignees: string[];
  timeContributions: StaffTimeContribution[];
  workloadHours: number;
  activityLog: ActivityLogEntry[];
}

export interface Task {
  id: string;
  ticketId: string;
  title: string;
  description?: string;
  goals?: string;
  dod?: string;
  status: TaskStatus;
  priority: TaskPriority;
  picName: string;
  lead: string;
  project: string;
  projectId: string;
  subtasks: Subtask[];
  deadline: string; // ISO date string
}

export interface Project {
  id: string;
  name: string;
  description: string;
  goals?: string;
  dod?: string;
  sprint: string;
  lead: string;
  totalTasks: number;
  doneTasks?: number;
  reviewTasks?: number;
  inProgressTasks?: number;
  todoTasks?: number;
}

export interface Column {
  id: TaskStatus;
  title: string;
}
