"use client";

import { ActivityLogEntry } from "@/lib/types";
import { STAFF_COLORS } from "./staff-time-summary";

interface ActivityLogProps {
  entries: ActivityLogEntry[];
}

const ACTION_LABELS: Record<ActivityLogEntry["action"], { label: string; dotClass: string }> = {
  created: { label: "Dibuat", dotClass: "bg-ink/30" },
  started: { label: "Dimulai", dotClass: "bg-blue-500" },
  paused: { label: "Dijeda", dotClass: "bg-amber-500" },
  resumed: { label: "Dilanjutkan", dotClass: "bg-blue-400" },
  completed: { label: "Selesai", dotClass: "bg-semantic-success" },
  review_requested: { label: "Review", dotClass: "bg-amber-500" },
  approved: { label: "Disetujui", dotClass: "bg-green-500" },
  revision_requested: { label: "Revisi", dotClass: "bg-red-500" },
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function getStaffColor(name: string): string {
  return STAFF_COLORS[name] || "#6b7280";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleDateString("id-ID", { month: "short" });
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${hours}:${mins}`;
}

function formatDuration(hours: number): string {
  if (hours === 0) return "";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}j`;
  return `${h}j ${m}m`;
}

export default function ActivityLog({ entries }: ActivityLogProps) {
  // Urutkan entries secara kronologis (terlama ke terbaru)
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  // Tampilkan maksimal 3 entri terbaru
  const recent = sorted.slice(-3);
  const hidden = sorted.length - recent.length;

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-xs py-xs">
        <span className="text-[11px] font-[320] text-ink/30 italic">
          Belum ada aktivitas tercatat
        </span>
      </div>
    );
  }

  return (
    <div className="relative pl-lg">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-sm bottom-0 w-[2px] bg-hairline-soft rounded-full" />

      {/* Show hidden count */}
      {hidden > 0 && (
        <div className="text-[10px] font-[320] text-ink/25 italic pb-xs">
          +{hidden} aktivitas sebelumnya
        </div>
      )}

      <div className="space-y-0">
        {recent.map((entry, idx) => {
          const actionInfo = ACTION_LABELS[entry.action];
          const isLast = idx === recent.length - 1;

          return (
            <div
              key={entry.id}
              className={`relative flex items-start gap-sm py-xs ${
                !isLast ? "pb-sm" : ""
              }`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-[-22px] top-[10px] w-[12px] h-[12px] rounded-full border-2 border-canvas flex-shrink-0 ${actionInfo.dotClass}`}
              />

              {/* Avatar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-[2px]"
                style={{ backgroundColor: getStaffColor(entry.staffName) }}
                title={entry.staffName}
              >
                <span className="text-[8px] font-[540] text-white leading-none">
                  {getInitials(entry.staffName)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm flex-wrap">
                  <span className="text-[13px] font-[450] text-ink/80 capitalize">
                    {entry.staffName}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
                    {actionInfo.label}
                  </span>
                  {entry.durationHours > 0 && (
                    <span className="font-mono text-[10px] tracking-[0.54px] text-ink/30 bg-surface-soft rounded-pill px-[6px] py-[1px]">
                      +{formatDuration(entry.durationHours)}
                    </span>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-[11px] font-[320] text-ink/35 mt-xxs">
                  {formatTimestamp(entry.timestamp)}
                </div>

                {/* Note */}
                {entry.note && (
                  <div className="text-[12px] font-[320] text-ink/45 mt-xxs leading-[1.4] break-words">
                    {entry.note}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
