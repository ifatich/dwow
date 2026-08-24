"use client";

import { Subtask } from "@/lib/types";
import StaffTimeSummary from "./staff-time-summary";
import ActivityLog from "./activity-log";

interface SubtaskDetailModalProps {
  subtask: Subtask | null;
  open: boolean;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  to_do: { label: "To Do", cls: "bg-surface-soft text-ink/60 border-hairline" },
  in_progress: { label: "In Progress", cls: "bg-blue-50 text-blue-600 border-blue-200" },
  review: { label: "Review", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  done: { label: "Done", cls: "bg-green-50 text-green-600 border-green-200" },
};

export default function SubtaskDetailModal({ subtask, open, onClose }: SubtaskDetailModalProps) {
  if (!open || !subtask) return null;

  const statusBadge = STATUS_BADGE[subtask.status] || STATUS_BADGE.to_do;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-md"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="bg-canvas rounded-lg max-w-[600px] w-full shadow-xl border border-hairline overflow-hidden flex flex-col max-h-[85vh] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between px-xl py-lg border-b border-hairline bg-surface-soft/30">
          <div>
            <div className="flex items-center gap-xs mb-xs">
              <span className={`inline-flex items-center rounded-pill px-sm py-xxs text-[10px] font-[540] border ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
              {subtask.workloadHours > 0 && (
                <span className="font-mono text-[10px] text-ink/40">
                  Est: {subtask.workloadHours}j
                </span>
              )}
            </div>
            <h3 className="text-[20px] font-[540] leading-[1.3] text-ink">
              {subtask.title}
            </h3>
            {subtask.assignees.length > 0 && (
              <p className="text-[12px] text-ink/50 mt-xxs">
                Assignee: <strong className="text-ink/70 font-medium">{subtask.assignees.join(", ")}</strong>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-hairline/50 transition-colors text-ink/40 hover:text-ink cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Body — Scrollable */}
        <div className="flex-1 overflow-y-auto px-xl py-lg space-y-md">
          {/* Kontribusi Waktu */}
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/40 block mb-xs">Kontribusi Waktu</span>
            <StaffTimeSummary subtask={subtask} />
          </div>

          {/* Deskripsi */}
          {subtask.description && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/40 block mb-xxs">Deskripsi</span>
              <p className="text-[13px] font-[320] leading-[1.5] text-ink/80 bg-surface-soft/40 p-sm rounded-md border border-hairline-soft">
                {subtask.description}
              </p>
            </div>
          )}

          {/* Goals */}
          {subtask.goals && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/40 block mb-xxs">Goals</span>
              <p className="text-[13px] font-[320] leading-[1.5] text-ink/80 bg-surface-soft/40 p-sm rounded-md border border-hairline-soft">
                {subtask.goals}
              </p>
            </div>
          )}

          {/* Definition of Done */}
          {subtask.dod && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/40 block mb-xxs">Definition of Done (DoD)</span>
              <p className="text-[13px] font-[320] leading-[1.5] text-ink/80 bg-surface-soft/40 p-sm rounded-md border border-hairline-soft">
                {subtask.dod}
              </p>
            </div>
          )}

          {/* Evidence Bukti Pengerjaan */}
          {subtask.evidence && (
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-green-600 block mb-xxs">Bukti Pengerjaan (Evidence)</span>
              <div className="rounded-md bg-green-50/50 border border-green-200/60 p-sm text-[13px] text-ink/80 break-words">
                {subtask.evidence}
              </div>
            </div>
          )}

          {/* Activity Log History */}
          <div className="pt-sm border-t border-hairline-soft">
            <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/40 block mb-xs">Riwayat Log Aktivitas</span>
            <ActivityLog entries={subtask.activityLog} />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-xl py-md border-t border-hairline flex justify-end bg-surface-soft/20">
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-lg rounded-md bg-surface-soft text-[13px] font-[480] text-ink/70 hover:bg-hairline hover:text-ink transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
