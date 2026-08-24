"use client";

import type { SprintGroupItem } from "../types";

/** Props for SprintProjectTable component. */
export interface SprintProjectTableProps {
  /** Array of grouped sprint items. */
  sprints: SprintGroupItem[];
  /** Filter selection for sprint. */
  selectedSprint?: string;
}

/**
 * SprintProjectTable Component
 *
 * Renders performance breakdown grouped by Sprint and Projects,
 * detailing project lead, task counts, hours, and completion rates.
 */
export default function SprintProjectTable({ sprints, selectedSprint = "all" }: SprintProjectTableProps) {
  const filtered = sprints.filter((s) => selectedSprint === "all" || s.sprint === selectedSprint);

  if (filtered.length === 0) {
    return (
      <div className="bg-canvas border border-hairline rounded-lg p-xl text-center text-[13px] text-ink/40">
        Tidak ada data sprint yang sesuai dengan filter.
      </div>
    );
  }

  return (
    <div className="bg-canvas border border-hairline rounded-lg overflow-hidden shadow-sm">
      <div className="p-lg border-b border-hairline bg-surface-soft/30 flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-[540] text-ink">Performa Sprint & Proyek</h3>
          <p className="text-[12px] text-ink/40">Status penyelesaian tugas dan alokasi jam kerja per proyek & sprint.</p>
        </div>
        <span className="text-[12px] font-[450] text-ink/50 font-mono">
          {filtered.length} Sprint
        </span>
      </div>

      <div className="p-lg space-y-xl">
        {filtered.map((sGroup) => {
          const groupPct = sGroup.totalTasks > 0 ? Math.round((sGroup.doneTasks / sGroup.totalTasks) * 100) : 0;
          return (
            <div key={sGroup.sprint} className="bg-surface-soft/20 border border-hairline-soft rounded-lg p-lg">
              <div className="flex items-center justify-between mb-md pb-md border-b border-hairline-soft flex-wrap gap-md">
                <div className="flex items-center gap-sm">
                  <span className="text-[18px] font-[540] text-ink">{sGroup.sprint}</span>
                  {sGroup.isActive && (
                    <span className="inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-[540] bg-green-100 text-green-700">
                      Aktif
                    </span>
                  )}
                  <span className="text-[12px] text-ink/40">• {sGroup.projects.length} Proyek</span>
                </div>
                <div className="flex items-center gap-xl text-[13px]">
                  <div>
                    <span className="text-ink/40">Tugas: </span>
                    <span className="font-[540] text-ink">{sGroup.doneTasks} / {sGroup.totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-ink/40">Total Jam: </span>
                    <span className="font-[540] text-ink">{sGroup.totalHours}j</span>
                  </div>
                  <div>
                    <span className="text-ink/40">Completion: </span>
                    <span className="font-[540] text-primary">{groupPct}%</span>
                  </div>
                </div>
              </div>

              {/* Projects Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left" aria-label={`Detail Proyek ${sGroup.sprint}`}>
                  <thead>
                    <tr className="text-[11px] font-[540] uppercase tracking-[0.5px] text-ink/40 border-b border-hairline-soft">
                      <th className="pb-xs">Nama Proyek</th>
                      <th className="pb-xs">Project Lead</th>
                      <th className="pb-xs text-right">Total Task</th>
                      <th className="pb-xs text-right">Selesai</th>
                      <th className="pb-xs text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sGroup.projects.map((proj) => {
                      const projPct = proj.totalTasks > 0 ? Math.round((proj.doneTasks / proj.totalTasks) * 100) : 0;
                      return (
                        <tr key={proj.id} className="border-b border-hairline-soft/60 last:border-0 text-[13px]">
                          <td className="py-sm font-[480] text-ink">{proj.name}</td>
                          <td className="py-sm text-ink/60">{proj.lead}</td>
                          <td className="py-sm text-right text-ink/70 tabular-nums">{proj.totalTasks}</td>
                          <td className="py-sm text-right text-ink/70 tabular-nums">{proj.doneTasks}</td>
                          <td className="py-sm text-right">
                            <div className="flex items-center justify-end gap-sm">
                              <div className="w-[80px] h-[4px] bg-surface-soft rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${projPct}%` }} />
                              </div>
                              <span className="font-[500] text-ink/60 tabular-nums w-[36px]">{projPct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
