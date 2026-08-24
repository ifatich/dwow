"use client";

import { useMemo } from "react";
import type { Task } from "@/lib/types";

interface TimeTrackingSummaryProps {
  tasks: Task[];
}

export default function TimeTrackingSummary({ tasks }: TimeTrackingSummaryProps) {
  const summary = useMemo(() => {
    let totalActive = 0;
    let totalReview = 0;
    const byStaff: Record<string, { active: number; review: number }> = {};

    for (const task of tasks) {
      for (const sub of task.subtasks) {
        for (const entry of sub.activityLog) {
          if (entry.action === "started" || entry.action === "resumed") continue; // not terminal
          if (entry.action === "completed") {
            totalActive += entry.durationHours;
            const s = byStaff[entry.staffName] || { active: 0, review: 0 };
            s.active += entry.durationHours;
            byStaff[entry.staffName] = s;
          }
          if (entry.action === "review_requested" || entry.action === "paused") {
            totalReview += entry.durationHours;
            const s = byStaff[entry.staffName] || { active: 0, review: 0 };
            s.review += entry.durationHours;
            byStaff[entry.staffName] = s;
          }
        }
        // Tambah dari timeContributions
        for (const c of sub.timeContributions) {
          const s = byStaff[c.staffName] || { active: 0, review: 0 };
          s.active += c.hours;
          byStaff[c.staffName] = s;
          totalActive += c.hours;
        }
      }
    }

    const staffList = Object.entries(byStaff)
      .map(([name, hours]) => ({ name, ...hours, total: hours.active + hours.review }))
      .sort((a, b) => b.total - a.total);

    return { totalActive, totalReview, staffList };
  }, [tasks]);

  const maxHours = Math.max(1, ...summary.staffList.map((s) => s.total));

  return (
    <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
      <div className="px-lg py-md border-b border-hairline bg-surface-soft/50">
        <h3 className="text-[14px] font-[540] text-ink">Ringkasan Pelacakan Waktu</h3>
        <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
          Total jam kerja aktif & waktu tunggu review per staff
        </p>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 border-b border-hairline">
        <div className="px-lg py-md text-center border-r border-hairline">
          <div className="text-[24px] font-[340] tabular-nums text-green-600">{summary.totalActive.toFixed(1)}j</div>
          <div className="text-[11px] font-[450] text-ink/40">Jam Aktif</div>
        </div>
        <div className="px-lg py-md text-center">
          <div className="text-[24px] font-[340] tabular-nums text-amber-600">{summary.totalReview.toFixed(1)}j</div>
          <div className="text-[11px] font-[450] text-ink/40">Jam Tunggu Review</div>
        </div>
      </div>

      {/* Per-staff bars */}
      <div className="p-lg space-y-sm">
        {summary.staffList.length === 0 ? (
          <p className="text-[13px] text-ink/25 text-center py-md">Belum ada data pelacakan waktu</p>
        ) : (
          summary.staffList.map((s) => (
            <div key={s.name} className="flex items-center gap-sm">
              <span className="text-[12px] font-[480] text-ink/70 w-[50px] text-right flex-shrink-0">{s.name}</span>
              <div className="flex-1 h-[18px] bg-surface-soft rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-400 transition-all"
                  style={{ width: `${(s.active / maxHours) * 100}%` }}
                  title={`Aktif: ${s.active.toFixed(1)}j`}
                />
                {s.review > 0 && (
                  <div
                    className="h-full bg-amber-300 transition-all"
                    style={{ width: `${(s.review / maxHours) * 100}%` }}
                    title={`Review: ${s.review.toFixed(1)}j`}
                  />
                )}
              </div>
              <span className="text-[11px] font-[480] tabular-nums text-ink/50 w-[40px] flex-shrink-0">{s.total.toFixed(1)}j</span>
            </div>
          ))
        )}
        {summary.staffList.length > 0 && (
          <div className="flex items-center gap-sm pt-xs text-[10px] text-ink/30">
            <span className="flex items-center gap-xxs"><span className="w-[8px] h-[8px] rounded-sm bg-green-400 inline-block" /> Aktif</span>
            <span className="flex items-center gap-xxs"><span className="w-[8px] h-[8px] rounded-sm bg-amber-300 inline-block" /> Review</span>
          </div>
        )}
      </div>
    </div>
  );
}
