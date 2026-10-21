"use client";

import { Task } from "@/lib/types";
import UserAvatar from "@/components/shared/user-avatar";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface TaskCardProps {
  task: Task;
  currentUser?: string;
}

export default function TaskCard({ task, currentUser }: TaskCardProps) {
  const completed = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Cek apakah ada subtask milik pengguna yang sedang login
  const normalizedUser = currentUser?.trim().toLowerCase();
  const isMyTask = normalizedUser
    ? task.subtasks.some((s) =>
      s.assignees.some((a) => a.toLowerCase() === normalizedUser)
    )
    : false;

  // Cek apakah user adalah Lead task ini dan memiliki subtask yang butuh review
  const isLead = Boolean(task.lead && normalizedUser && task.lead.toLowerCase() === normalizedUser);
  const reviewSubtasksCount = task.subtasks.filter((s) => s.status === "review").length;
  const hasReviewPending = isLead && reviewSubtasksCount > 0;

  // Deadline calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = diffDays < 0;
  const isToday = diffDays === 0;
  const isSoon = diffDays >= 1 && diffDays <= 3;
  const isDone = task.status === "done";

  const deadlineLabel = isDone
    ? "Selesai"
    : isOverdue
      ? `Terlambat ${Math.abs(diffDays)} hari`
      : isToday
        ? "Hari ini"
        : `${diffDays} hari lagi`;

  const deadlineClass = isDone
    ? "bg-green-50 text-green-600"
    : isOverdue
      ? "bg-red-50 text-red-600"
      : isToday || isSoon
        ? "bg-amber-50 text-amber-700"
        : "bg-surface-soft text-ink/40";

  return (
    <div
      role="button"
      tabIndex={0}
      className={`w-full text-left rounded-lg p-lg transition-all duration-200 cursor-pointer group ${
        hasReviewPending
          ? "bg-amber-50/40 border-2 border-amber-400 shadow-xs ring-1 ring-amber-300/40"
          : isMyTask
            ? "bg-canvas border-2 border-lime-500"
            : "bg-canvas border border-hairline hover:border-ink/20 hover:shadow-sm"
      }`}
    >
      {/* Ticket ID + Priority + Deadline */}
      <div className="flex items-center justify-between mb-sm gap-xs flex-wrap">
        <div className="flex items-center gap-xs flex-wrap">
          <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/50">
            {task.ticketId}
          </span>
          {hasReviewPending && (
            <span className="inline-flex items-center gap-1 text-[10px] font-[550] text-amber-900 bg-amber-200/90 border border-amber-300/80 rounded-pill px-2 py-0.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
              <span>{reviewSubtasksCount} Review</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-xxs flex-wrap">
          <span
            className={`inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-medium priority-${task.priority}`}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>
          <span
            className={`inline-flex items-center rounded-pill px-[8px] py-[2px] text-[10px] font-[540] ${deadlineClass}`}
          >
            {isOverdue && !isDone && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="mr-xxs">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 2.5v3M5 7.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            {deadlineLabel}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-[450] leading-[1.4] tracking-[-0.14px] text-ink mb-sm">
        {task.title}
      </h3>

      {/* Review pending notification on task card */}
      {hasReviewPending && (
        <div className="mb-sm">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-[520] text-amber-900 bg-amber-100/90 border border-amber-300/70 rounded-md px-2.5 py-1">
            <span>🔍 {reviewSubtasksCount} subtask menunggu review Anda</span>
          </span>
        </div>
      )}

      {/* Subtask progress */}
      {total > 0 && (
        <div className="mb-sm">
          <div className="flex items-center justify-between mb-xxs">
            <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/50">
              Subtask
            </span>
            <span className="font-mono text-[11px] text-ink/50">
              {completed}/{total}
            </span>
          </div>
          <div className="w-full h-[4px] bg-surface-soft rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Assignee Avatar Stack (derived from subtask assignees) + Lead */}
      <div className="flex items-center gap-xs pt-sm border-t border-hairline-soft">
        {(() => {
          const taskAssignees = [...new Set(
            task.subtasks.flatMap(s => s.assignees)
          )];
          if (taskAssignees.length === 0) {
            return (
              <div className="flex items-center gap-1.5 min-w-0">
                <UserAvatar name={task.picName} size="xs" />
                <span className="text-[13px] font-[450] text-ink/60 truncate">{task.picName}</span>
              </div>
            );
          }
          return (
            <div className="flex items-center -space-x-1 flex-shrink-0">
              {taskAssignees.slice(0, 4).map((name) => {
                const isUser = normalizedUser && name.toLowerCase() === normalizedUser;
                return (
                  <UserAvatar
                    key={name}
                    name={name}
                    size="xs"
                    className={`border-2 border-canvas transition-all ${
                      isUser ? "ring-2 ring-emerald-500 z-10" : ""
                    }`}
                    title={name}
                  />
                );
              })}
              {taskAssignees.length > 4 && (
                <span className="text-[11px] text-ink/40 pl-1.5">+{taskAssignees.length - 4}</span>
              )}
            </div>
          );
        })()}
        <span className="text-ink/25">·</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-[320] text-ink/60 min-w-0 truncate">
          <span className="text-ink/40">Lead:</span>
          <UserAvatar name={task.lead} size="2xs" />
          <span className="truncate">{task.lead}</span>
        </span>
      </div>
    </div>
  );
}
