"use client";

import { Task } from "@/lib/types";
import Link from "next/link";

interface ReviewFlat {
  id: string; ticketId: string; title: string; status: string; priority: string;
  picName: string; lead: string; project: string; projectId: string; deadline: string;
  subtaskDone: number; subtaskTotal: number;
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

  return (
    <Link
      href={`/project/${(task as Task).projectId || (task as ReviewFlat).projectId}`}
      className="block group bg-amber-50/40 rounded-lg border border-amber-200/60 hover:border-amber-300 transition-colors p-lg"
    >
      <div className="flex items-center justify-between mb-sm">
        <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/40">
          {task.ticketId}
        </span>
        <div className="flex items-center gap-xxs">
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
      <h3 className="text-[16px] font-[540] leading-[1.35] tracking-[-0.14px] text-ink mb-md">
        {task.title}
      </h3>

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
        <span className="text-[12px] font-[450] text-ink/60 capitalize">
          {task.picName}
        </span>
        <span className="text-ink/20">·</span>
        <span className="text-[12px] font-[320] text-ink/40">
          Lead: {task.lead}
        </span>
        <span className="text-ink/20">·</span>
        <span className="text-[12px] font-[320] text-ink/40 capitalize">
          {task.project}
        </span>
        <span className="ml-auto text-[12px] font-[480] text-amber-600 group-hover:text-amber-700 transition-colors">
          Review →
        </span>
      </div>
    </Link>
  );
}
