"use client";

import { useState } from "react";
import { Subtask, ActivityLogEntry } from "@/lib/types";
import { STAFF_COLORS } from "@/features/task/components/staff-time-summary";

interface ConsolidatedActivityFeedProps {
  subtasks: Subtask[];
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Dibuat", color: "#9ca3af" },
  started: { label: "Dimulai", color: "#3b82f6" },
  paused: { label: "Dijeda", color: "#f59e0b" },
  resumed: { label: "Dilanjutkan", color: "#60a5fa" },
  completed: { label: "Selesai", color: "#22c55e" },
  review_requested: { label: "Review", color: "#f59e0b" },
  approved: { label: "Disetujui", color: "#22c55e" },
  revision_requested: { label: "Revisi", color: "#ef4444" },
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("id-ID", { month: "short" });
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${hours}:${mins}`;
}

type MergedEntry = ActivityLogEntry & { subtaskTitle: string };

export default function ConsolidatedActivityFeed({ subtasks }: ConsolidatedActivityFeedProps) {
  const [collapsed, setCollapsed] = useState(true);

  // Merge all subtask activity logs, sort by timestamp desc
  const allEntries: MergedEntry[] = subtasks
    .flatMap((sub) =>
      sub.activityLog.map((entry) => ({
        ...entry,
        subtaskTitle: sub.title,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (allEntries.length === 0) {
    return (
      <div className="bg-surface-soft/30 rounded-lg border border-hairline-soft p-lg text-center">
        <p className="text-[13px] font-[320] text-ink/30 italic">Belum ada aktivitas tercatat</p>
      </div>
    );
  }

  const visibleEntries = collapsed ? allEntries.slice(0, 2) : allEntries;
  const hasMore = allEntries.length > 2;

  return (
    <div className="bg-surface-soft/30 rounded-lg border border-hairline-soft p-lg">
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-xs">
          <h3 className="text-[14px] font-[540] text-ink">Aktivitas Terbaru</h3>
          <span className="text-[11px] font-[450] text-ink/40 bg-surface-soft rounded-pill px-xs py-xxs">
            {allEntries.length}
          </span>
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-xxs font-mono text-[11px] uppercase tracking-[0.54px] text-ink/40 hover:text-ink transition-colors cursor-pointer"
          >
            <span>{collapsed ? `Lihat Semua (${allEntries.length})` : "Sembunyikan"}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="relative pl-xl">
        {/* Timeline line */}
        <div className="absolute left-[8px] top-1 bottom-1 w-[2px] bg-hairline rounded-full" />

        <div className="space-y-0">
          {visibleEntries.map((entry, idx) => {
            const actionInfo = ACTION_LABELS[entry.action] || { label: entry.action, color: "#9ca3af" };

            return (
              <div key={`${entry.id}-${idx}`} className="relative flex items-start gap-sm pb-md last:pb-0">
                {/* Dot */}
                <div
                  className="absolute left-[-22px] top-[8px] w-[10px] h-[10px] rounded-full border-2 border-canvas flex-shrink-0"
                  style={{ backgroundColor: actionInfo.color }}
                />

                {/* Avatar */}
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 mt-[2px]"
                  style={{ backgroundColor: STAFF_COLORS[entry.staffName] || "#6b7280" }}
                >
                  <span className="text-[7px] font-[540] text-white leading-none">
                    {getInitials(entry.staffName)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm flex-wrap">
                    <span className="text-[13px] font-[540] text-ink/80 capitalize">{entry.staffName}</span>
                    <span className="text-[12px] font-[450] text-ink/50">{actionInfo.label}</span>
                    <span className="text-[12px] font-[320] text-ink/35 truncate max-w-[200px]">
                      {entry.subtaskTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-sm mt-xxs">
                    <span className="text-[11px] font-[320] text-ink/30">{formatTime(entry.timestamp)}</span>
                    {entry.durationHours > 0 && (
                      <span className="text-[10px] font-[540] text-ink/25 bg-surface-soft rounded-pill px-[6px] py-[1px]">
                        +{Math.floor(entry.durationHours)}j{entry.durationHours % 1 > 0 ? ` ${Math.round((entry.durationHours % 1) * 60)}m` : ""}
                      </span>
                    )}
                  </div>
                  {entry.note && (
                    <p className="text-[11px] font-[320] text-ink/40 mt-xxs leading-[1.4] break-words">{entry.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasMore && collapsed && (
        <div className="mt-md pt-sm border-t border-hairline-soft/60 flex justify-center">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-[12px] font-[450] text-primary hover:underline cursor-pointer flex items-center gap-xs"
          >
            <span>+ {allEntries.length - 2} aktivitas lainnya...</span>
          </button>
        </div>
      )}
    </div>
  );
}
