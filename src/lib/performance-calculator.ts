/**
 * Performance Calculator Utility (`performance-calculator.ts`)
 *
 * Provides fair, unbiased, and robust mathematical scoring algorithms
 * for evaluating performance metrics across Staff and Lead roles in BRD Task Forge.
 *
 * @module lib/performance-calculator
 */

/** Input parameters for calculating Staff performance score. */
export interface StaffPerformanceInput {
  workloadHours: number;
  capacityHours: number;
  subtasksDone: number;
  subtasksTotal: number;
}

/** Input parameters for calculating Lead performance score. */
export interface LeadPerformanceInput {
  workloadHours: number;
  capacityHours: number;
  subtasksDone: number;
  subtasksTotal: number;
  reviewsDone: number;
  reviewsTotal: number;
}

/** Detailed result breakdown returned by performance calculation functions. */
export interface PerformanceResult {
  /** Final weighted score (0 to 100). */
  score: number;
  /** Component score for workload utilization (0 to 100). */
  utilizationScore: number;
  /** Component score for subtask completion (0 to 100). */
  subtaskCompletionScore: number;
  /** Component score for team review completion (0 to 100), applicable for Lead. */
  reviewCompletionScore?: number;
  /** Descriptive summary of weight distribution applied. */
  weightBreakdown: string;
}

/**
 * Calculates the Utilization Score based on the "Goldilocks Rule":
 * - Under 80%: Proportional scaling (e.g., 40% utilization = 50 score).
 * - 80% to 100%: Sweet Spot (strictly 100 score).
 * - Over 100%: Overload penalty (deducts 1 point per 1% over 100). Clamped to min 0.
 *
 * @param workloadHours - Total allocated workload hours.
 * @param capacityHours - Effective capacity hours (accounting for leave).
 * @returns Utilization score from 0 to 100.
 */
export function calculateUtilizationScore(workloadHours: number, capacityHours: number): number {
  if (!capacityHours || capacityHours <= 0) return 0;

  const rawUtilizationPercent = (workloadHours / capacityHours) * 100;

  if (rawUtilizationPercent < 80) {
    return Math.round((rawUtilizationPercent / 80) * 100);
  }

  if (rawUtilizationPercent <= 100) {
    return 100;
  }

  // Overload penalty: 1 point deduction per 1% over 100%
  const overloadExcess = rawUtilizationPercent - 100;
  const penalizedScore = 100 - overloadExcess;

  return Math.max(0, Math.round(penalizedScore));
}

/**
 * Calculates the Task Completion Score:
 * - Returns 100 if total tasks is 0 (prevents unfair penalty when no tasks were assigned).
 * - Otherwise returns percentage ratio (done / total * 100).
 *
 * @param done - Number of completed tasks.
 * @param total - Total number of assigned tasks.
 * @returns Completion score from 0 to 100.
 */
export function calculateCompletionScore(done: number, total: number): number {
  if (!total || total <= 0) return 100;
  const safeDone = Math.max(0, done || 0);
  const ratio = (safeDone / total) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

/**
 * Calculates the final performance score for Staff members (50/50 Weighting).
 *
 * - 50% Utilization Score (Goldilocks Rule)
 * - 50% Subtask Completion Score
 *
 * @param data - Staff performance input metrics.
 * @returns Detailed performance result object.
 */
export function calculateStaffPerformance(data: StaffPerformanceInput): PerformanceResult {
  const utilizationScore = calculateUtilizationScore(data.workloadHours, data.capacityHours);
  const subtaskCompletionScore = calculateCompletionScore(data.subtasksDone, data.subtasksTotal);

  const weightedScore = Math.round(utilizationScore * 0.5 + subtaskCompletionScore * 0.5);

  return {
    score: Math.min(100, Math.max(0, weightedScore)),
    utilizationScore,
    subtaskCompletionScore,
    weightBreakdown: "50% Workload Utilisasi · 50% Subtask Selesai",
  };
}

/**
 * Calculates the final performance score for Lead members using Dynamic Weighting.
 *
 * Rules:
 * - Edge Case (0 direct subtasks & reviews exist): 40% Utilization, 60% Review Completion.
 * - Normal Case (direct subtasks & reviews exist): 33.3% Utilization, 33.3% Subtasks, 33.4% Reviews.
 * - No subtasks & no reviews: 100% Utilization.
 *
 * @param data - Lead performance input metrics.
 * @returns Detailed performance result object.
 */
export function calculateLeadPerformance(data: LeadPerformanceInput): PerformanceResult {
  const utilizationScore = calculateUtilizationScore(data.workloadHours, data.capacityHours);
  const subtaskCompletionScore = calculateCompletionScore(data.subtasksDone, data.subtasksTotal);
  const reviewCompletionScore = calculateCompletionScore(data.reviewsDone, data.reviewsTotal);

  const hasSubtasks = data.subtasksTotal > 0;
  const hasReviews = data.reviewsTotal > 0;

  let weightedScore = 0;
  let weightBreakdown = "";

  if (!hasSubtasks && hasReviews) {
    // Edge case: Pure Lead focusing on team reviews
    weightedScore = utilizationScore * 0.4 + reviewCompletionScore * 0.6;
    weightBreakdown = "40% Workload Utilisasi · 60% Review Subtask Tim";
  } else if (hasSubtasks && hasReviews) {
    // Normal case: Dual role (executing subtasks & reviewing team)
    weightedScore = utilizationScore * 0.333 + subtaskCompletionScore * 0.333 + reviewCompletionScore * 0.334;
    weightBreakdown = "33.3% Workload · 33.3% Subtask Mandiri · 33.4% Review Tim";
  } else if (hasSubtasks && !hasReviews) {
    // Lead acting purely as executor
    weightedScore = utilizationScore * 0.5 + subtaskCompletionScore * 0.5;
    weightBreakdown = "50% Workload Utilisasi · 50% Subtask Mandiri";
  } else {
    // Fallback: Default to utilization
    weightedScore = utilizationScore;
    weightBreakdown = "100% Workload Utilisasi";
  }

  return {
    score: Math.min(100, Math.max(0, Math.round(weightedScore))),
    utilizationScore,
    subtaskCompletionScore,
    reviewCompletionScore,
    weightBreakdown,
  };
}
