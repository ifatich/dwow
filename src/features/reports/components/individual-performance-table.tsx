"use client";

import { useMemo } from "react";
import Tooltip from "@/components/ui/tooltip";
import type { StaffMetric } from "../types";

/** Props for the IndividualPerformanceTable component. */
export interface IndividualPerformanceTableProps {
  /** Array of staff metric records. */
  staff: StaffMetric[];
}

/** Formatted staff member row with computed category. */
export interface ProcessedStaffMetric extends StaffMetric {
  computedCategory: "Top Performer" | "Optimal" | "Overload" | "Underutilized";
}

/**
 * EmptyState Subcomponent
 *
 * Renders a graceful fallback view inside the table when filters return 0 results.
 */
function EmptyState() {
  return (
    <tr className="border-b border-hairline-soft">
      <td colSpan={8} className="py-xxl px-lg text-center">
        <div className="flex flex-col items-center justify-center gap-xs py-lg">
          <div className="w-12 h-12 rounded-full bg-surface-soft flex items-center justify-center text-ink/30 mb-xs">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[14px] font-[500] text-ink/70">
            Tidak ada data kinerja untuk kombinasi filter ini.
          </p>
          <p className="text-[12px] text-ink/40 max-w-[360px]">
            Coba ubah filter pengguna atau pilih periode sprint yang berbeda untuk melihat data.
          </p>
        </div>
      </td>
    </tr>
  );
}

/**
 * IndividualPerformanceTable Component
 *
 * Renders the detailed staff performance table with strict UX safeguards:
 * 1. Top 3 Performer extraction (Score >= 75 & Utilization <= 110%)
 * 2. Visual Clamping for progress bar width (`Math.min(utilization, 100)%`)
 * 3. Transparent calculation tooltips on final score hover
 * 4. Dedicated `<EmptyState />` fallback
 * 5. Strict Tailwind category badge & progress bar color coding
 */
export default function IndividualPerformanceTable({ staff }: IndividualPerformanceTableProps) {
  /**
   * Process and rank staff members:
   * 1. Sort staff members by performanceScore descending.
   * 2. Extract Top 3 members meeting criteria (score >= 75 & utilization <= 110%).
   * 3. Map status categories for every staff member.
   */
  const processedStaffList = useMemo<ProcessedStaffMetric[]>(() => {
    if (!staff || staff.length === 0) return [];

    // Sort descending by score (secondary tie-breaker: subtasksDone)
    const sorted = [...staff].sort(
      (a, b) => b.performanceScore - a.performanceScore || b.subtasksDone - a.subtasksDone
    );

    // Identify Top 3 candidates in active team (or top 1-2 if team < 3)
    const topCount = Math.min(3, sorted.length);
    const topThreeUsernames = new Set(sorted.slice(0, topCount).map((s) => s.username));

    return sorted.map((s) => {
      let computedCategory: ProcessedStaffMetric["computedCategory"] = "Optimal";

      if (topThreeUsernames.has(s.username)) {
        computedCategory = "Top Performer";
      } else if (s.utilization > 110) {
        computedCategory = "Overload";
      } else if (s.utilization < 75 || s.performanceScore < 60) {
        computedCategory = "Underutilized";
      } else {
        computedCategory = "Optimal";
      }

      return {
        ...s,
        computedCategory,
      };
    });
  }, [staff]);

  const getStatusBadgeStyle = (category: ProcessedStaffMetric["computedCategory"]) => {
    switch (category) {
      case "Top Performer":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Overload":
        return "bg-red-100 text-red-700 border-red-200";
      case "Underutilized":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Optimal":
      default:
        return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const getUtilizationProgressColor = (utilization: number) => {
    if (utilization > 110) return "bg-red-500";
    if (utilization >= 70) return "bg-green-500";
    return "bg-blue-400";
  };

  return (
    <div className="bg-canvas border border-hairline rounded-lg overflow-hidden shadow-sm">
      {/* Table Header Section */}
      <div className="p-lg border-b border-hairline bg-surface-soft/30 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-[540] text-ink">Rincian Kinerja Anggota Tim</h3>
          <p className="text-[12px] text-ink/40">
            Data detail kapasitas, jam kerja aktual, pencapaian subtask, dan tugas review lead.
          </p>
        </div>
        <span className="text-[12px] font-[450] text-ink/50 font-mono">
          {processedStaffList.length} Anggota Tim
        </span>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Tabel Kinerja Individu">
          <thead>
            <tr className="bg-surface-soft/60 border-b border-hairline">
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40">
                Staff
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-center">
                Role
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Subtasks Selesai
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Review Lead
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Beban / Kapasitas
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Utilisasi
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Skor Kinerja
              </th>
              <th className="px-lg py-md text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {processedStaffList.length === 0 ? (
              <EmptyState />
            ) : (
              processedStaffList.map((s) => (
                <tr
                  key={s.username}
                  className="border-b border-hairline-soft hover:bg-surface-soft/30 transition-colors"
                >
                  {/* 1. Staff Identity */}
                  <td className="px-lg py-md">
                    <div className="flex flex-col">
                      <span className="text-[14px] font-[500] text-ink">{s.name}</span>
                      <span className="text-[11px] text-ink/40 font-mono">@{s.username}</span>
                    </div>
                  </td>

                  {/* 2. Role Badge */}
                  <td className="px-lg py-md text-center">
                    <span
                      className={`inline-flex items-center rounded-pill px-[8px] py-[2px] text-[10px] font-[540] uppercase tracking-[0.5px] ${
                        s.role === "lead"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}
                    >
                      {s.role}
                    </span>
                  </td>

                  {/* 3. Subtasks Done Ratio */}
                  <td className="px-lg py-md text-right">
                    <span className="text-[13px] font-[480] text-ink tabular-nums">
                      {s.subtasksDone} / {s.subtasksTotal}
                    </span>
                  </td>

                  {/* 4. Lead Review Ratio */}
                  <td className="px-lg py-md text-right">
                    {s.role === "lead" ? (
                      <div className="inline-flex flex-col items-end">
                        <span className="text-[13px] font-[480] text-ink tabular-nums">
                          {s.reviewsDone} / {s.reviewsTotal}
                        </span>
                        {(s.reviewsPending || 0) > 0 && (
                          <span className="text-[10px] text-amber-600 font-[500]">
                            ({s.reviewsPending} pending)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[13px] text-ink/25">-</span>
                    )}
                  </td>

                  {/* 5. Workload vs Capacity */}
                  <td className="px-lg py-md text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="text-[13px] font-[480] text-ink tabular-nums">
                        {s.workload}j / {s.capacity}j
                      </span>
                      {(s.leaveDays || 0) > 0 && (
                        <span className="text-[10px] text-ink/35 font-mono">
                          cuti {s.leaveDays}h
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 6. Utilization % (Honest text display + Clamped progress bar width) */}
                  <td className="px-lg py-md text-right">
                    <div className="flex items-center justify-end gap-sm">
                      <div className="w-[60px] h-[5px] bg-surface-soft rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getUtilizationProgressColor(
                            s.utilization
                          )}`}
                          style={{ width: `${Math.min(s.utilization, 100)}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-[500] text-ink/70 w-[36px] text-right tabular-nums">
                        {s.utilization}%
                      </span>
                    </div>
                  </td>

                  {/* 7. Final Performance Score (Transparent Calculation Tooltip) */}
                  <td className="px-lg py-md text-right">
                    <Tooltip
                      content={s.weightBreakdown || "50% Workload Utilisasi · 50% Subtask Selesai"}
                      position="top"
                    >
                      <div className="inline-flex items-center gap-xxs border-b border-dashed border-ink/20 hover:border-ink/60 transition-colors">
                        <span className="text-[15px] font-[600] text-ink tabular-nums">
                          {s.performanceScore}
                        </span>
                        <span className="text-[11px] text-ink/35 font-normal">/ 100</span>
                      </div>
                    </Tooltip>
                  </td>

                  {/* 8. Status Badge */}
                  <td className="px-lg py-md text-right">
                    <span
                      className={`inline-flex items-center rounded-pill px-md py-[2px] text-[11px] font-[540] border ${getStatusBadgeStyle(
                        s.computedCategory
                      )}`}
                    >
                      {s.computedCategory === "Top Performer" && "⭐️ "}
                      {s.computedCategory}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
