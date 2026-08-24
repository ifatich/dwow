"use client";

import type { SummaryData } from "../types";

/** Props for the KPIHeaderCards component. */
export interface KPIHeaderCardsProps {
  /** Aggregated summary metrics for the team. */
  summary: SummaryData;
  /** Total number of unique sprints in the calculation context. */
  totalSprintsCount: number;
}

/**
 * KPIHeaderCards Component
 *
 * Renders 4 executive summary cards displaying team-wide performance KPIs:
 * 1. Team Average Performance Score (0-100)
 * 2. Global Task Completion Rate (%)
 * 3. Total Workload vs Capacity (Hours)
 * 4. Staff Category Distribution Badges (Top, Optimal, Overload, Underutilized)
 */
export default function KPIHeaderCards({ summary, totalSprintsCount }: KPIHeaderCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mb-xxl" aria-label="Executive KPI Summary">
      {/* 1. Rata-Rata Skor Kinerja Tim */}
      <div className="bg-surface-soft/40 rounded-lg p-lg border border-hairline-soft flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 mb-xs">
            Rata-Rata Skor Tim
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="text-[32px] font-[540] text-ink tabular-nums">
              {summary.avgPerformanceScore}
            </span>
            <span className="text-[14px] text-ink/40 font-normal">/ 100</span>
          </div>
        </div>
        <div className="mt-md">
          <div className="w-full h-[4px] bg-surface-soft rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, summary.avgPerformanceScore))}%` }}
            />
          </div>
          <p className="text-[11px] text-ink/40 mt-xs">Skor bobot gabungan utilisasi & penyelesaian</p>
        </div>
      </div>

      {/* 2. Tingkat Penyelesaian Tugas */}
      <div className="bg-surface-soft/40 rounded-lg p-lg border border-hairline-soft flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 mb-xs">
            Tingkat Penyelesaian
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="text-[32px] font-[540] text-ink tabular-nums">
              {summary.completionRate}%
            </span>
          </div>
        </div>
        <div className="mt-md">
          <div className="text-[13px] font-[450] text-ink/70">
            {summary.doneTasks} dari {summary.totalTasks} tugas selesai
          </div>
          <p className="text-[11px] text-ink/40 mt-xxs">Pencapaian dari seluruh sprint terpilih</p>
        </div>
      </div>

      {/* 3. Total Jam Kerja vs Kapasitas Tim */}
      <div className="bg-surface-soft/40 rounded-lg p-lg border border-hairline-soft flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 mb-xs">
            Total Jam Kerja Tim
          </div>
          <div className="flex items-baseline gap-xs">
            <span className="text-[32px] font-[540] text-ink tabular-nums">
              {summary.totalWorkload}j
            </span>
            <span className="text-[13px] text-ink/40 font-normal">/ {summary.totalCapacity}j</span>
          </div>
        </div>
        <div className="mt-md">
          <div className="text-[13px] font-[450] text-ink/70">
            Kapasitas ({totalSprintsCount} Sprint YTD)
          </div>
          <p className="text-[11px] text-ink/40 mt-xxs">Mengakomodasi kalkulasi potongan cuti</p>
        </div>
      </div>

      {/* 4. Distribusi Kategori Staff */}
      <div className="bg-surface-soft/40 rounded-lg p-lg border border-hairline-soft flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-[540] uppercase tracking-[0.6px] text-ink/40 mb-xs">
            Distribusi Kategori
          </div>
          <div className="flex items-center gap-xs flex-wrap mt-xs">
            <span className="inline-flex items-center rounded-pill px-[8px] py-[2px] text-[11px] font-[500] bg-purple-100 text-purple-700 border border-purple-200">
              ⭐️ Top: {summary.topPerformersCount}
            </span>
            <span className="inline-flex items-center rounded-pill px-[8px] py-[2px] text-[11px] font-[500] bg-green-100 text-green-700 border border-green-200">
              Optimal: {summary.optimalCount}
            </span>
            <span className="inline-flex items-center rounded-pill px-[8px] py-[2px] text-[11px] font-[500] bg-red-100 text-red-700 border border-red-200">
              Overload: {summary.overloadCount}
            </span>
            <span className="inline-flex items-center rounded-pill px-[8px] py-[2px] text-[11px] font-[500] bg-blue-100 text-blue-700 border border-blue-200">
              Under: {summary.underutilizedCount}
            </span>
          </div>
        </div>
        <div className="mt-sm">
          <p className="text-[11px] text-ink/40">Status alokasi beban & performa tim</p>
        </div>
      </div>
    </section>
  );
}
