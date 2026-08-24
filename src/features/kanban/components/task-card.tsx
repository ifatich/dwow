"use client";

import { Task } from "@/lib/types";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const completed = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

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
      className="w-full text-left bg-canvas border border-hairline hover:border-ink/20 rounded-lg p-lg 
                 transition-colors duration-200 cursor-pointer group"
    >
      {/* Ticket ID + Priority + Deadline */}
      <div className="flex items-center justify-between mb-sm">
        <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/50">
          {task.ticketId}
        </span>
        <div className="flex items-center gap-xxs">
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
      <h3 className="text-[16px] font-[450] leading-[1.4] tracking-[-0.14px] text-ink mb-md">
        {task.title}
      </h3>

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
            return <span className="text-[13px] font-[450] text-ink/60">{task.picName}</span>;
          }
          return (
            <div className="flex items-center gap-xxs">
              {taskAssignees.slice(0, 4).map((name) => (
                <span key={name} className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-primary/10 text-[10px] font-[540] text-primary uppercase" title={name}>
                  {name.charAt(0)}
                </span>
              ))}
              {taskAssignees.length > 4 && (
                <span className="text-[11px] text-ink/40">+{taskAssignees.length - 4}</span>
              )}
            </div>
          );
        })()}
        <span className="text-ink/25">·</span>
        <span className="text-[13px] font-[320] text-ink/40">
          Lead: {task.lead}
        </span>
      </div>
    </div>
  );
}
