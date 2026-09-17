"use client";

import { useState } from "react";
import type { ExecutiveProjectReportData, ExecutiveProjectItem } from "../types";

export interface ExecutiveProjectReportTableProps {
  data?: ExecutiveProjectReportData;
  periodLabel?: string;
}

export default function ExecutiveProjectReportTable({
  data,
  periodLabel = "Bulanan",
}: ExecutiveProjectReportTableProps) {
  const [filterCategory, setFilterCategory] = useState<"all" | "in_progress" | "completed" | "planned">("all");

  if (!data) {
    return (
      <div className="bg-canvas border border-hairline rounded-lg p-xl text-center text-[13px] text-ink/40">
        Data laporan eksekutif proyek tidak tersedia.
      </div>
    );
  }

  const { summary, inProgressProjects, completedProjects, plannedProjects } = data;

  const displaySections = [
    {
      key: "in_progress",
      title: "Sedang Dikerjakan (In Progress)",
      badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
      description: "Proyek aktif yang sedang dalam pengerjaan tim sprint saat ini.",
      items: inProgressProjects,
    },
    {
      key: "completed",
      title: "Sudah Dikerjakan (Completed)",
      badgeBg: "bg-green-100 text-green-700 border-green-200",
      description: "Proyek yang seluruh tugas dan kriteria penyelesaiannya telah selesai 100%.",
      items: completedProjects,
    },
    {
      key: "planned",
      title: "Akan Dikerjakan (Planned / Upcoming)",
      badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
      description: "Proyek terencana untuk siklus sprint berikutnya.",
      items: plannedProjects,
    },
  ].filter((sec) => filterCategory === "all" || filterCategory === sec.key);

  return (
    <div className="space-y-xl">
      {/* High-Level Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
        <div className="bg-canvas border border-hairline rounded-xl p-lg shadow-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">Total Proyek Portfolio</span>
          <div className="text-[32px] font-[540] text-ink mt-xs">{summary.totalProjects}</div>
          <div className="text-[12px] text-ink/50 mt-1">Rata-rata Progress: <strong className="text-ink font-semibold">{summary.overallProgressPct}%</strong></div>
        </div>

        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-lg shadow-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-blue-600 font-semibold">Sedang Dikerjakan</span>
          <div className="text-[32px] font-[540] text-blue-700 mt-xs">{summary.inProgressCount}</div>
          <div className="text-[12px] text-blue-600 mt-1">Proyek Aktif berjalan</div>
        </div>

        <div className="bg-green-50/60 border border-green-100 rounded-xl p-lg shadow-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-green-600 font-semibold">Sudah Dikerjakan</span>
          <div className="text-[32px] font-[540] text-green-700 mt-xs">{summary.completedCount}</div>
          <div className="text-[12px] text-green-600 mt-1">Completion 100%</div>
        </div>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-lg shadow-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-amber-600 font-semibold">Akan Dikerjakan</span>
          <div className="text-[32px] font-[540] text-amber-700 mt-xs">{summary.plannedCount}</div>
          <div className="text-[12px] text-amber-600 mt-1">Sprint Rencana Mendatang</div>
        </div>
      </div>

      {/* Filter Category Toolbar */}
      <div className="bg-canvas border border-hairline rounded-lg p-md flex items-center justify-between flex-wrap gap-md">
        <div className="flex items-center gap-xs">
          <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/40 mr-xs">
            Filter Status Proyek:
          </span>
          {[
            { id: "all", label: `Semua Proyek (${summary.totalProjects})` },
            { id: "in_progress", label: `Sedang Dikerjakan (${summary.inProgressCount})` },
            { id: "completed", label: `Sudah Dikerjakan (${summary.completedCount})` },
            { id: "planned", label: `Akan Dikerjakan (${summary.plannedCount})` },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id as any)}
              className={`h-[30px] rounded-pill px-md text-[12px] font-[480] transition-colors cursor-pointer ${
                filterCategory === cat.id ? "bg-ink text-canvas shadow-xs" : "bg-surface-soft text-ink/60 hover:text-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <span className="text-[12px] font-mono text-ink/40">Periode: {periodLabel}</span>
      </div>

      {/* Grouped Section Tables */}
      {displaySections.map((sec) => (
        <div key={sec.key} className="bg-canvas border border-hairline rounded-xl overflow-hidden shadow-sm">
          <div className="p-lg border-b border-hairline bg-surface-soft/30 flex items-center justify-between flex-wrap gap-md">
            <div>
              <div className="flex items-center gap-sm">
                <h3 className="text-[18px] font-[540] text-ink">{sec.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${sec.badgeBg}`}>
                  {sec.items.length} Proyek
                </span>
              </div>
              <p className="text-[12px] text-ink/50 mt-0.5">{sec.description}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {sec.items.length === 0 ? (
              <div className="p-xl text-center text-[13px] text-ink/40">
                Tidak ada proyek pada kategori ini.
              </div>
            ) : (
              <table className="w-full text-left border-collapse" aria-label={sec.title}>
                <thead>
                  <tr className="text-[11px] font-[540] uppercase tracking-[0.54px] text-ink/40 border-b border-hairline bg-surface-soft/20">
                    <th className="py-md px-lg">Nama Proyek & Deskripsi</th>
                    <th className="py-md px-md">Project Lead</th>
                    <th className="py-md px-md">Sprint Target</th>
                    <th className="py-md px-md text-right">Done / Total Task</th>
                    <th className="py-md px-md text-right">Workload</th>
                    <th className="py-md px-lg text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline-soft/60">
                  {sec.items.map((proj: ExecutiveProjectItem) => (
                    <tr key={proj.id} className="hover:bg-surface-soft/20 transition-colors text-[13px]">
                      <td className="py-md px-lg">
                        <div className="font-[540] text-ink">{proj.name}</div>
                        {proj.description && (
                          <div className="text-[12px] text-ink/50 line-clamp-1 mt-0.5">{proj.description}</div>
                        )}
                      </td>
                      <td className="py-md px-md">
                        <span className="inline-flex items-center gap-1 font-medium text-ink/70">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[9px] flex items-center justify-center font-bold">
                            {proj.lead.charAt(0).toUpperCase()}
                          </span>
                          {proj.lead}
                        </span>
                      </td>
                      <td className="py-md px-md">
                        <span className="px-2 py-0.5 rounded bg-surface-soft text-ink/60 text-[11px] font-mono border border-hairline-soft">
                          {proj.sprint}
                        </span>
                      </td>
                      <td className="py-md px-md text-right tabular-nums text-ink/80 font-medium">
                        {proj.doneTasks} / {proj.totalTasks}
                      </td>
                      <td className="py-md px-md text-right tabular-nums text-ink/70">
                        {proj.workloadHours}j
                      </td>
                      <td className="py-md px-lg text-right">
                        <div className="flex items-center justify-end gap-sm">
                          <div className="w-[90px] h-[6px] bg-surface-soft rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                proj.progressPct === 100
                                  ? "bg-green-500"
                                  : proj.progressPct > 0
                                  ? "bg-blue-600"
                                  : "bg-gray-300"
                              }`}
                              style={{ width: `${proj.progressPct}%` }}
                            />
                          </div>
                          <span className="font-semibold text-ink tabular-nums w-[36px]">
                            {proj.progressPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
