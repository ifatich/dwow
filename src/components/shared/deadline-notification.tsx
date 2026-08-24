"use client";

import { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import Link from "next/link";

interface DeadlineNotificationProps {
  tasks: Task[];
}

interface DeadlineInfo {
  task: Task;
  label: string;
  variant: "overdue" | "today" | "soon";
}

function getDeadlineInfo(task: Task): DeadlineInfo | null {
  if (task.status === "done") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      task,
      label: `Terlambat ${Math.abs(diffDays)} hari`,
      variant: "overdue",
    };
  }
  if (diffDays === 0) {
    return { task, label: "Hari ini", variant: "today" };
  }
  if (diffDays <= 3) {
    return { task, label: `${diffDays} hari lagi`, variant: "soon" };
  }
  return null;
}

const VARIANT_STYLES = {
  overdue: { dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50" },
  today: { dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
  soon: { dot: "bg-amber-400", text: "text-amber-600", bg: "bg-amber-50/50" },
};

export default function DeadlineNotification({
  tasks,
}: DeadlineNotificationProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const urgentTasks = tasks
    .map(getDeadlineInfo)
    .filter((d): d is DeadlineInfo => d !== null)
    .sort((a, b) => {
      const order = { overdue: 0, today: 1, soon: 2 };
      return order[a.variant] - order[b.variant];
    });

  const overdueCount = urgentTasks.filter((d) => d.variant === "overdue").length;
  const todayCount = urgentTasks.filter((d) => d.variant === "today").length;

  if (urgentTasks.length === 0) return null;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-surface-soft hover:bg-hairline transition-colors flex items-center justify-center cursor-pointer"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-ink/60"
        >
          <path
            d="M8 2a4 4 0 00-4 4v2c0 .7-.3 1.3-.8 1.7l-.3.3h10.2l-.3-.3c-.5-.4-.8-1-.8-1.7V6a4 4 0 00-4-4z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M6 13a2 2 0 004 0"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>

        {/* Badge */}
        {(overdueCount > 0 || todayCount > 0) && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-[700] flex items-center justify-center leading-none">
            {overdueCount + todayCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-[340px] bg-canvas border border-hairline rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-lg py-md border-b border-hairline-soft">
            <span className="text-[14px] font-[540] text-ink">
              Deadline Mendekati
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
              {urgentTasks.length} tugas
            </span>
          </div>

          {/* Task list */}
          <div className="max-h-[320px] overflow-y-auto">
            {urgentTasks.map((info) => {
              const styles = VARIANT_STYLES[info.variant];
              return (
                <Link
                  key={info.task.id}
                  href={`/project/${info.task.projectId}`}
                  className="flex items-start gap-sm px-lg py-md hover:bg-surface-soft/50 transition-colors border-b border-hairline-soft last:border-0"
                >
                  {/* Status dot */}
                  <div
                    className={`w-[8px] h-[8px] rounded-full mt-[6px] flex-shrink-0 ${styles.dot}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[450] text-ink/80 leading-[1.4] truncate">
                      {info.task.title}
                    </p>
                    <div className="flex items-center gap-sm mt-xxs">
                      <span className="font-mono text-[10px] uppercase text-ink/30">
                        {info.task.ticketId.split("-")[0]}
                      </span>
                      <span className="text-ink/15">·</span>
                      <span className={`text-[11px] font-[540] ${styles.text}`}>
                        {info.label}
                      </span>
                    </div>
                  </div>

                  {/* Priority pill */}
                  <span
                    className={`inline-flex items-center rounded-pill px-[8px] py-[1px] text-[10px] font-medium flex-shrink-0 priority-${info.task.priority}`}
                  >
                    {info.task.priority.charAt(0).toUpperCase() +
                      info.task.priority.slice(1)}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-lg py-sm border-t border-hairline-soft bg-surface-soft/30">
            <span className="text-[11px] font-[320] text-ink/35">
              Klik tugas untuk melihat detail di papan Kanban
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
