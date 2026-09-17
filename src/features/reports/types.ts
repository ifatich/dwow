/**
 * Performance Reports Types (`types.ts`)
 *
 * Explicit TypeScript definitions for performance metrics,
 * report summary aggregates, and sprint/project performance structures.
 *
 * @module features/reports/types
 */

export type Period = "bulanan" | "kuartalan" | "tahunan";
export type ReportTab = "individual" | "sprint" | "executive";

/** Detailed metrics for an individual staff or lead member. */
export interface StaffMetric {
  name: string;
  username: string;
  role: "staff" | "lead" | "kadep" | "kadiv" | "super_admin" | string;
  department: string;
  capacity: number;
  workload: number;
  avgSprintWorkload?: number;
  utilization: number;
  subtasksDone: number;
  subtasksTotal: number;
  isOverload: boolean;
  leaveDays?: number;
  reviewsTotal?: number;
  reviewsDone?: number;
  reviewsPending?: number;
  totalCombinedTasks?: number;
  doneCombinedTasks?: number;
  performanceScore: number;
  performanceCategory: string;
  weightBreakdown?: string;
}

/** Executive summary aggregated metrics across the team. */
export interface SummaryData {
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
  totalWorkload: number;
  totalCapacity: number;
  avgPerformanceScore: number;
  topPerformersCount: number;
  optimalCount: number;
  overloadCount: number;
  underutilizedCount: number;
}

export interface ExecutiveProjectItem {
  id: string;
  name: string;
  description: string;
  lead: string;
  sprint: string;
  statusCategory: "in_progress" | "completed" | "planned";
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  progressPct: number;
  workloadHours: number;
}

export interface ExecutiveProjectReportData {
  summary: {
    totalProjects: number;
    inProgressCount: number;
    completedCount: number;
    plannedCount: number;
    overallProgressPct: number;
    totalWorkloadHours: number;
  };
  inProgressProjects: ExecutiveProjectItem[];
  completedProjects: ExecutiveProjectItem[];
  plannedProjects: ExecutiveProjectItem[];
}

/** Complete report response payload. */
export interface ReportData {
  period: string;
  sprintFilter: string;
  userFilter: string;
  totalSprintsCount: number;
  summary: SummaryData;
  staff: StaffMetric[];
  executiveProjects?: ExecutiveProjectReportData;
}

/** Single project item within a sprint group. */
export interface SprintProjectItem {
  id: string;
  name: string;
  lead: string;
  totalTasks: number;
  doneTasks: number;
  tasks: unknown[];
}

/** Grouped sprint summary item. */
export interface SprintGroupItem {
  sprint: string;
  totalTasks: number;
  doneTasks: number;
  totalHours: number;
  projects: SprintProjectItem[];
  isActive?: boolean;
}
