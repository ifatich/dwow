/**
 * Performance Reports Types (`types.ts`)
 *
 * Explicit TypeScript definitions for performance metrics,
 * report summary aggregates, and sprint/project performance structures.
 *
 * @module features/reports/types
 */

export type Period = "bulanan" | "kuartalan";
export type ReportTab = "individual" | "sprint";

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

/** Complete report response payload. */
export interface ReportData {
  period: string;
  sprintFilter: string;
  userFilter: string;
  totalSprintsCount: number;
  summary: SummaryData;
  staff: StaffMetric[];
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
