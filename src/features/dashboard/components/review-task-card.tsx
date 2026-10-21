"use client";

import { Task } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "@/components/shared/user-avatar";

interface ReviewSubtaskItem {
  id: string;
  title: string;
  status: string;
  assignees: string[];
  workloadHours?: number;
}

interface ReviewFlat {
  id: string; ticketId: string; title: string; status: string; priority: string;
  picName: string; picAvatar?: string | null; lead: string; leadName?: string; leadAvatar?: string | null;
  project: string; projectId: string; deadline: string;
  subtaskDone: number; subtaskTotal: number;
  reviewSubtasksCount?: number;
  reviewSubtasks?: ReviewSubtaskItem[];
}

interface ReviewTaskCardProps {
  task: Task | ReviewFlat;
}

function getDeadlineBadge(deadline: string): { label: string; urgent: boolean } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Terlambat ${Math.abs(diff)}h`, urgent: true };
  if (diff === 0) return { label: "Hari ini", urgent: true };
  if (diff <= 2) return { label: `${diff}h lagi`, urgent: true };
  return null;
}

export default function ReviewTaskCard({ task }: ReviewTaskCardProps) {
  const isFlat = "subtaskDone" in task;
  const completed = isFlat ? (task as ReviewFlat).subtaskDone : (task as Task).subtasks.filter((s) => s.done).length;
  const total = isFlat ? (task as ReviewFlat).subtaskTotal : (task as Task).subtasks.length;
  const allDone = completed === total;
  const deadlineInfo = getDeadlineBadge(task.deadline);

  const reviewSubtasks: ReviewSubtaskItem[] =
    (task as any).reviewSubtasks ||
    ((task as Task).subtasks
      ? (task as Task).subtasks
          .filter((s) => s.status === "review")
          .map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            assignees: s.assignees,
            workloadHours: s.workloadHours,
          }))
      : []);
  const reviewCount = (task as any).reviewSubtasksCount ?? reviewSubtasks.length;
  const hasReviewPending = reviewCount > 0;

  const projectId = (task as Task).projectId || (task as ReviewFlat).projectId;
  const href = projectId && task.id ? `/project/${projectId}/task/${task.id}` : `/project/${projectId}`;

  return (
    <Link
      href={href}
      className={`block group rounded-lg border transition-all p-lg ${
        hasReviewPending
          ? "bg-amber-50/50 border-amber-300 hover:border-amber-400 hover:shadow-xs ring-1 ring-amber-300/40"
          : "bg-canvas border-hairline hover:border-ink/20"
      }`}
    >
      <div className="flex items-center justify-between mb-sm gap-xs flex-wrap">
        <div className="flex items-center gap-xs flex-wrap">
          <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/40">
            {task.ticketId}
          </span>
          {hasReviewPending && (
            <span className="inline-flex items-center gap-1 text-[10px] font-[550] text-amber-900 bg-amber-200/90 border border-amber-300/80 rounded-pill px-2 py-0.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
              <span>{reviewCount} Subtask Perlu Review</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-xxs flex-wrap">
          {deadlineInfo && (
            <span className={`inline-flex items-center rounded-pill px-[8px] py-[2px] text-[10px] font-[540] ${deadlineInfo.urgent ? "bg-red-100 text-red-600" : "bg-surface-soft text-ink/40"}`}>
              {deadlineInfo.label}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-medium priority-${task.priority}`}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-[540] leading-[1.35] tracking-[-0.14px] text-ink mb-sm">
        {task.title}
      </h3>

      {/* Daftar Subtask yang Sedang di Posisi Review */}
      {reviewSubtasks.length > 0 && (
        <div className="mb-md space-y-1.5">
          <div className="text-[11px] font-[550] text-amber-900/90 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Subtask yang Menunggu Review Anda:</span>
          </div>
          <div className="space-y-1">
            {reviewSubtasks.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-100/70 border border-amber-300/80 text-[12px] text-amber-950 shadow-2xs hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                  <span className="font-[520] truncate">{st.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {st.assignees && st.assignees.length > 0 && (
                    <div className="flex -space-x-1">
                      {st.assignees.map((a) => (
                        <UserAvatar key={a} name={a} size="2xs" />
                      ))}
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-[550] bg-amber-500 text-white rounded-pill px-2 py-0.5 shadow-2xs">
                    Tinjau Subtask →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtask progress */}
      <div className="mb-sm">
        <div className="flex items-center justify-between mb-xxs">
          <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
            Subtask
          </span>
          <div className="flex items-center gap-xs">
            <span className="font-mono text-[10px] text-ink/40">
              {completed}/{total}
            </span>
            {allDone ? (
              <span className="inline-flex items-center rounded-pill px-[6px] py-[1px] text-[9px] font-[540] bg-green-100 text-green-700">
                Siap
              </span>
            ) : (
              <span className="inline-flex items-center rounded-pill px-[6px] py-[1px] text-[9px] font-[540] bg-amber-100 text-amber-700">
                {total - completed} belum
              </span>
            )}
          </div>
        </div>
        <div className="w-full h-[4px] bg-amber-200/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all"
            style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-xs pt-sm border-t border-amber-200/40">
        <div className="flex items-center gap-1 min-w-0">
          <UserAvatar
            name={task.picName}
            avatar={(task as any).picAvatar}
            size="xs"
          />
          <span className="text-[12px] font-[450] text-ink/70 capitalize truncate">
            {task.picName}
          </span>
        </div>
        <span className="text-ink/20">·</span>
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-[12px] font-[320] text-ink/40">Lead:</span>
          <UserAvatar
            name={(task as any).leadName || task.lead}
            avatar={(task as any).leadAvatar}
            size="xs"
          />
          <span className="text-[12px] font-[320] text-ink/60 truncate">
            {task.lead}
          </span>
        </div>
        <span className="text-ink/20">·</span>
        <span className="text-[12px] font-[320] text-ink/40 capitalize truncate max-w-[120px]">
          {task.project}
        </span>
        <span className="ml-auto text-[12px] font-[480] text-amber-600 group-hover:text-amber-700 transition-colors flex-shrink-0">
          Review →
        </span>
      </div>
    </Link>
  );
}
