"use client";

import { Task } from "@/lib/types";

interface TaskDistributionChartProps {
  tasks: Task[] | Record<string, number>;
}

export default function TaskDistributionChart({ tasks }: TaskDistributionChartProps) {
  const counts = Array.isArray(tasks)
    ? {
        todo: tasks.filter((t) => t.status === "todo").length,
        "in-progress": tasks.filter((t) => t.status === "in-progress").length,
        done: tasks.filter((t) => t.status === "done").length,
      }
    : {
        todo: tasks.todo || 0,
        "in-progress": tasks["in-progress"] || 0,
        done: tasks.done || 0,
      };

  const total = counts.todo + counts["in-progress"] + counts.done;
  const todoPct = total > 0 ? Math.round((counts.todo / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((counts["in-progress"] / total) * 100) : 0;
  const donePct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  // Evaluation logic for overall performance
  let performanceStatus: { label: string; badgeClass: string; textClass: string; desc: React.ReactNode; icon: string };

  if (total === 0) {
    performanceStatus = {
      label: "Belum Ada Data",
      badgeClass: "bg-gray-100 text-gray-600 border-gray-200",
      textClass: "text-gray-500",
      desc: "Belum ada tugas yang tercatat dalam sistem.",
      icon: "⚪",
    };
  } else if (donePct > 80) {
    performanceStatus = {
      label: "Sangat Baik",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      textClass: "text-emerald-700",
      desc: `Performa sangat baik! ${donePct}% dari seluruh tugas telah selesai (Done).`,
      icon: "🟢",
    };
  } else if (donePct > 60) {
    performanceStatus = {
      label: "Perlu Evaluasi",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      textClass: "text-amber-700",
      desc: `Tingkat penyelesaian ${donePct}%. Perlu evaluasi untuk menuntaskan sisa tugas.`,
      icon: "🟡",
    };
  } else {
    performanceStatus = {
      label: "Sangat Kurang (Red Notice)",
      badgeClass: "bg-red-100 text-red-800 border-red-300",
      textClass: "text-red-700",
      desc: (
        <>
          <strong className="font-[700] text-red-700">Red Notice!</strong> Penyelesaian akumulatif sangat kurang. Kamu hanya menyelesaikan ({donePct}%) dari semua task dan subtask.
        </>
      ),
      icon: "🔴",
    };
  }

  return (
    <div className="bg-surface-soft/60 rounded-lg border border-hairline-soft p-lg flex flex-col justify-between h-full">
      {/* Header — Identical Style */}
      <div className="flex items-center justify-between mb-md">
        <div>
          <h3 className="text-[14px] font-[540] text-ink">Distribusi Tugas & Performa</h3>
          <p className="text-[11px] font-[320] text-ink/40 mt-xxs">
            Akumulasi {total} tugas dari seluruh sprint
          </p>
        </div>
        <div className="flex items-center gap-xs">
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.5px] border rounded-pill px-sm py-xxs font-[540] ${performanceStatus.badgeClass}`}
          >
            {performanceStatus.icon} {performanceStatus.label}
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 flex flex-col justify-center">
        {/* Performance Brief Summary Banner */}
        <div className="bg-canvas/80 border border-hairline-soft rounded-md px-md py-xs mb-md flex items-center gap-xs">
          <span className="text-[11px] font-[400] text-ink/70 leading-tight">
            {performanceStatus.desc}
          </span>
        </div>

        {/* Multi-segment Horizontal Progress Bar */}
        <div className="mb-md">
          <div className="w-full h-[12px] bg-canvas/80 rounded-full overflow-hidden flex gap-[2px] p-[2px] border border-hairline-soft">
            {counts.todo > 0 && (
              <div
                className="h-full bg-slate-400 rounded-l-full transition-all duration-500"
                style={{ width: `${todoPct}%` }}
                title={`To Do: ${counts.todo} (${todoPct}%)`}
              />
            )}
            {counts["in-progress"] > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${inProgressPct}%` }}
                title={`In Progress: ${counts["in-progress"]} (${inProgressPct}%)`}
              />
            )}
            {counts.done > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-r-full transition-all duration-500"
                style={{ width: `${donePct}%` }}
                title={`Done: ${counts.done} (${donePct}%)`}
              />
            )}
          </div>
        </div>

        {/* Status Metric Cards Grid */}
        <div className="grid grid-cols-3 gap-sm">
          {/* To Do Card */}
          <div className="bg-canvas border border-hairline-soft rounded-md p-md flex flex-col justify-between transition-all hover:border-slate-300">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-[11px] font-[480] text-ink/50">To Do</span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[22px] font-[540] text-ink tabular-nums leading-none">
                {counts.todo}
              </span>
              <span className="text-[10px] font-mono text-ink/40 tabular-nums">
                {todoPct}%
              </span>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="bg-blue-50/40 border border-blue-200/60 rounded-md p-md flex flex-col justify-between transition-all hover:border-blue-300">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-[11px] font-[480] text-blue-700">In Progress</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[22px] font-[540] text-blue-900 tabular-nums leading-none">
                {counts["in-progress"]}
              </span>
              <span className="text-[10px] font-mono text-blue-700/60 tabular-nums">
                {inProgressPct}%
              </span>
            </div>
          </div>

          {/* Done Card */}
          <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-md p-md flex flex-col justify-between transition-all hover:border-emerald-300">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-[11px] font-[480] text-emerald-700">Done</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[22px] font-[540] text-emerald-900 tabular-nums leading-none">
                {counts.done}
              </span>
              <span className="text-[10px] font-mono text-emerald-700/60 tabular-nums">
                {donePct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Legend — Identical Style */}
      <div className="flex items-center justify-between mt-md pt-sm border-t border-hairline-soft">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-[11px] font-[450] text-ink/50">To Do</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-[450] text-ink/50">In Progress</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-[450] text-ink/50">Done</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-ink/40">
          Total {total} Task
        </span>
      </div>
    </div>
  );
}
