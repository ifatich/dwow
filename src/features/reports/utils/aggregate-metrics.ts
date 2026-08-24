import { calculateStaffPerformance, calculateLeadPerformance } from "@/lib/performance-calculator";
import type { StaffMetric } from "../types";

/** Raw user metrics record prior to sprint/period aggregation. */
export interface RawUserAssignment {
  username: string;
  name: string;
  role: string;
  department?: string;
  capacityHoursPerMonth?: number;
  leaveDays?: number;
  workload: number;
  subtasksDone: number;
  subtasksTotal: number;
  reviewsDone?: number;
  reviewsTotal?: number;
  reviewsPending?: number;
}

/**
 * Aggregates raw staff metrics across multiple sprints & period multipliers.
 *
 * UX & Math Safeguards:
 * 1. Dynamic Capacity Multiplication: Multiplies base sprint capacity by `selectedSprintsCount * periodMultiplier`.
 *    Prevents 300%+ utilization spikes when viewing multi-sprint data.
 * 2. Zero-Data Handling: Ensures staff with 0 subtasks in a sprint evaluate safely without NaN/Infinity.
 * 3. Recalculates performance scores dynamically post-aggregation.
 *
 * @param rawUsers - Array of raw user assignment records.
 * @param selectedSprintsCount - Total count of active/selected sprints (defaults to 1).
 * @param periodMultiplier - Multiplier for period (1 for monthly, 3 for quarterly).
 * @returns Array of aggregated StaffMetric objects ready for UI display.
 */
export function aggregateStaffMetrics(
  rawUsers: RawUserAssignment[],
  selectedSprintsCount: number = 1,
  periodMultiplier: number = 1
): StaffMetric[] {
  const safeSprintsCount = Math.max(1, Number(selectedSprintsCount) || 1);
  const safePeriodMultiplier = Math.max(1, Number(periodMultiplier) || 1);
  const totalMultiplier = safeSprintsCount * safePeriodMultiplier;

  return rawUsers.map((user) => {
    const isLead = user.role === "lead";

    // 1. Calculate Base Capacity per Sprint & Dynamic Aggregated Capacity
    const monthlyCapacity = Number(user.capacityHoursPerMonth) || 160;
    const baseSprintCapacity = Math.round(monthlyCapacity / 2); // 80h per sprint base
    const leaveDays = Number(user.leaveDays) || 0;
    const leaveHoursPerSprint = leaveDays * 8;

    // Net capacity per sprint (accounting for leave days)
    const netSprintCapacity = Math.max(10, baseSprintCapacity - leaveHoursPerSprint);

    // Dynamic total capacity for the selected sprint count & period
    const capacity = netSprintCapacity * totalMultiplier;

    // 2. Safe Zero-Data Workload & Task Ratios (guarded against undefined/null)
    const workload = Math.max(0, Math.round((Number(user.workload) || 0) * 10) / 10);
    const subtasksDone = Math.max(0, Number(user.subtasksDone) || 0);
    const subtasksTotal = Math.max(0, Number(user.subtasksTotal) || 0);
    const reviewsDone = Math.max(0, Number(user.reviewsDone) || 0);
    const reviewsTotal = Math.max(0, Number(user.reviewsTotal) || 0);
    const reviewsPending = Math.max(0, Number(user.reviewsPending) || 0);

    // 3. Compute Utilization safely (guarded against division by zero)
    const utilization = capacity > 0 ? Math.round((workload / capacity) * 100) : 0;
    const isOverload = utilization > 110;

    // 4. Recalculate Performance Score using Performance Calculator Utility
    const perfResult = isLead
      ? calculateLeadPerformance({
          workloadHours: workload,
          capacityHours: capacity,
          subtasksDone,
          subtasksTotal,
          reviewsDone,
          reviewsTotal,
        })
      : calculateStaffPerformance({
          workloadHours: workload,
          capacityHours: capacity,
          subtasksDone,
          subtasksTotal,
        });

    const safeScore = Math.min(100, Math.max(0, Number(perfResult.score) || 0));

    return {
      name: user.name || user.username,
      username: user.username,
      role: user.role || "staff",
      department: user.department || "Engineering",
      capacity,
      workload,
      utilization,
      subtasksDone,
      subtasksTotal,
      isOverload,
      leaveDays: leaveDays * totalMultiplier,
      reviewsTotal: isLead ? reviewsTotal : undefined,
      reviewsDone: isLead ? reviewsDone : undefined,
      reviewsPending: isLead ? reviewsPending : undefined,
      totalCombinedTasks: subtasksTotal + (isLead ? reviewsTotal : 0),
      doneCombinedTasks: subtasksDone + (isLead ? reviewsDone : 0),
      performanceScore: safeScore,
      performanceCategory: "Optimal",
      weightBreakdown: perfResult.weightBreakdown,
    };
  });
}
