"use client";

import { Subtask, StaffTimeContribution } from "@/lib/types";

interface StaffTimeSummaryProps {
  subtask: Subtask;
}

/** Warna avatar per staff (consistent palette) */
export const STAFF_COLORS: Record<string, string> = {
  ariana: "#8b5cf6",
  budi: "#3b82f6",
  citra: "#ec4899",
  dian: "#f59e0b",
  eko: "#22c55e",
  fani: "#06b6d4",
  gina: "#f97316",
  hadi: "#6366f1",
};

function getStaffColor(name: string): string {
  return STAFF_COLORS[name] || "#6b7280";
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function BarRow({
  name,
  contribution,
  maxHours,
}: {
  name: string;
  contribution: StaffTimeContribution;
  maxHours: number;
}) {
  const barPercent = maxHours > 0 ? (contribution.hours / maxHours) * 100 : 0;
  const color = getStaffColor(name);

  return (
    <div className="flex items-center gap-xs">
      {/* Avatar */}
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color }}
        title={name}
      >
        <span className="text-[8px] font-[540] text-white leading-none">
          {getInitials(name)}
        </span>
      </div>

      {/* Name & bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-xxs">
          <span className="text-[12px] font-[450] text-ink/80 capitalize truncate">
            {name}
          </span>
          <span className="text-[12px] font-[540] text-ink tabular-nums ml-xs flex-shrink-0">
            {formatHours(contribution.hours)}
          </span>
        </div>
        <div className="w-full h-[4px] bg-surface-soft rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(barPercent, 2)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function StaffTimeSummary({ subtask }: StaffTimeSummaryProps) {
  const { timeContributions, workloadHours, assignees } = subtask;
  const assigneeCount = assignees.length || 1;

  // Workload per person (divided equally per PRD)
  const workloadPerPerson = workloadHours / assigneeCount;

  // Total actual hours
  const totalActual =
    timeContributions.length > 0
      ? timeContributions.reduce((sum, tc) => sum + tc.hours, 0)
      : 0;

  // Max hours for bar scaling — use max of per-person actual or per-person workload
  const maxHours = Math.max(
    ...timeContributions.map((tc) => tc.hours),
    workloadPerPerson,
    1
  );

  // Efficiency: actual per-person vs estimated per-person
  const efficiency =
    workloadPerPerson > 0
      ? Math.round((totalActual / assigneeCount / workloadPerPerson) * 100)
      : 0;

  const isOverBudget =
    totalActual / assigneeCount > workloadPerPerson && workloadPerPerson > 0;

  return (
    <div className="bg-surface-soft/60 rounded-md p-md border border-hairline-soft">
      {/* Header: label + workload comparison */}
      <div className="flex items-center justify-between mb-sm gap-xs flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40 flex-shrink-0">
          Kontribusi Waktu
        </span>
        {workloadPerPerson > 0 && (
          <div className="flex items-center gap-xxs flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
              Est/org
            </span>
            <span className="text-[10px] font-[540] text-ink/50 tabular-nums">
              {formatHours(workloadPerPerson)}
            </span>
            {totalActual > 0 && (
              <>
                <span className="text-ink/25 text-[10px]">vs</span>
                <span
                  className={`text-[10px] font-[540] tabular-nums ${
                    isOverBudget ? "text-red-500" : "text-semantic-success"
                  }`}
                >
                  {formatHours(totalActual / assigneeCount)}
                </span>
                <span
                  className={`inline-flex items-center rounded-pill px-[5px] py-[1px] text-[9px] font-[540] ${
                    isOverBudget
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {efficiency}%
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Empty state: no time logged yet */}
      {timeContributions.length === 0 && (
        <div className="flex items-center gap-xs py-xs">
          {/* Show assigned staff avatars without time */}
          <div className="flex -space-x-xxs">
            {assignees.map((name) => (
              <div
                key={name}
                className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-canvas"
                style={{ backgroundColor: getStaffColor(name) }}
                title={name}
              >
                <span className="text-[7px] font-[540] text-white leading-none">
                  {getInitials(name)}
                </span>
              </div>
            ))}
          </div>
          <span className="text-[11px] font-[320] text-ink/35 italic">
            Belum ada waktu
          </span>
        </div>
      )}

      {/* Bar chart per staff */}
      {timeContributions.length > 0 && (
        <div className="space-y-xs">
          {timeContributions.map((tc) => (
            <BarRow
              key={tc.staffName}
              name={tc.staffName}
              contribution={tc}
              maxHours={maxHours}
            />
          ))}
        </div>
      )}

      {/* Over-budget warning */}
      {isOverBudget && (
        <div className="mt-xs flex items-center gap-xs px-xs py-xxs rounded-sm bg-red-50/60 border border-red-100">
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            className="flex-shrink-0"
          >
            <path
              d="M7 1L13 12H1L7 1Z"
              fill="#ef4444"
              stroke="#ef4444"
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
            <path d="M7 5v3M7 10.5v.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-[450] text-red-700">
            +{formatHours(totalActual / assigneeCount - workloadPerPerson)}/org
          </span>
        </div>
      )}
    </div>
  );
}
