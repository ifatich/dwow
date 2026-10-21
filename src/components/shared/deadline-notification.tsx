"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Task } from "@/lib/types";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useRealtimeSync } from "@/lib/realtime-sync";
import Link from "next/link";

export interface ReviewTaskNotificationItem {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  priority?: string;
  picName?: string;
  lead?: string;
  project?: string;
  projectId?: string;
  deadline?: string;
  subtaskDone?: number;
  subtaskTotal?: number;
  reviewSubtasksCount?: number;
  reviewSubtasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignees: string[];
    workloadHours: number;
  }>;
}

export interface DeadlineTaskItem {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string;
  project?: string;
  projectId?: string;
}

interface DeadlineNotificationProps {
  tasks?: (Task | DeadlineTaskItem)[];
  reviewTasks?: ReviewTaskNotificationItem[];
}

interface DeadlineInfo {
  task: Task | DeadlineTaskItem;
  label: string;
  variant: "overdue" | "today" | "soon";
}

function getDeadlineInfo(task: Task | DeadlineTaskItem): DeadlineInfo | null {
  if (!task || task.status === "done" || !task.deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  if (isNaN(deadline.getTime())) return null;

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
  tasks: propsTasks,
  reviewTasks: propsReviewTasks,
}: DeadlineNotificationProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";
  const username = currentUser?.username;

  const [fetchedReviewTasks, setFetchedReviewTasks] = useState<ReviewTaskNotificationItem[]>([]);
  const [fetchedTasks, setFetchedTasks] = useState<DeadlineTaskItem[]>([]);

  // Auto fetch data jika tidak disediakan melalui props (misal di halaman detail atau sub-halaman)
  const loadData = useCallback(async () => {
    if (typeof window !== "undefined" && window.location.pathname === "/login") return;
    if (!username || role !== "lead") {
      setFetchedReviewTasks([]);
      return;
    }
    try {
      const params = new URLSearchParams({ role, username: username || "" });
      const res = await fetch(`/api/dashboard?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reviewTasks)) {
          setFetchedReviewTasks(data.reviewTasks);
        }
        if (propsTasks === undefined && Array.isArray(data.tasks)) {
          setFetchedTasks(data.tasks);
        }
      }
    } catch {
      // Ignore network errors
    }
  }, [role, username, propsTasks]);

  useEffect(() => {
    if (propsReviewTasks === undefined || propsTasks === undefined) {
      loadData();
    }
  }, [propsReviewTasks, propsTasks, loadData]);

  // Realtime sync listener untuk memperbarui daftar review begitu subtask selesai direview
  useRealtimeSync(() => {
    if (propsReviewTasks === undefined || propsTasks === undefined) {
      loadData();
    }
  }, 5000);

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

  const reviewList = propsReviewTasks !== undefined ? propsReviewTasks : fetchedReviewTasks;
  const taskList = propsTasks !== undefined ? propsTasks : fetchedTasks;

  const urgentTasks = taskList
    .map(getDeadlineInfo)
    .filter((d): d is DeadlineInfo => d !== null)
    .sort((a, b) => {
      const order = { overdue: 0, today: 1, soon: 2 };
      return order[a.variant] - order[b.variant];
    });

  const overdueCount = urgentTasks.filter((d) => d.variant === "overdue").length;
  const todayCount = urgentTasks.filter((d) => d.variant === "today").length;

  // Review list: tampilkan maksimal 5 tugas
  const displayReviewTasks = reviewList.slice(0, 5);

  const hasUrgent = overdueCount > 0 || todayCount > 0;
  const hasReview = reviewList.length > 0;
  const totalBadgeCount = (overdueCount + todayCount) + reviewList.length;

  // Bell hanya hilang jika benar-benar tidak ada tugas urgent deadline dan tidak ada tugas review
  if (urgentTasks.length === 0 && reviewList.length === 0) return null;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-full bg-surface-soft hover:bg-hairline transition-colors flex items-center justify-center cursor-pointer"
        aria-label="Notifikasi Tugas dan Review"
        title={
          hasReview && hasUrgent
            ? `${reviewList.length} tugas perlu review, ${overdueCount + todayCount} deadline mendesak`
            : hasReview
              ? `${reviewList.length} tugas perlu review`
              : hasUrgent
                ? `${overdueCount + todayCount} tugas mendekati deadline`
                : "Notifikasi"
        }
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

        {/* Badge: merah jika ada deadline mendesak, amber jika ada task review */}
        {totalBadgeCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-[700] flex items-center justify-center leading-none ${
              hasUrgent ? "bg-red-500" : "bg-amber-500"
            }`}
          >
            {totalBadgeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-[360px] bg-canvas border border-hairline rounded-lg shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-lg py-md border-b border-hairline-soft bg-surface-soft/20">
            <div className="flex items-center gap-xs">
              <span className="text-[14px] font-[540] text-ink">
                Notifikasi
              </span>
              {reviewList.length > 0 && (
                <span className="inline-flex items-center rounded-pill bg-amber-100 text-amber-800 text-[10px] font-[600] px-sm py-0.5 border border-amber-200">
                  {reviewList.length} Review
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
              {reviewList.length + urgentTasks.length} total
            </span>
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-hairline-soft">
            {/* Section: Perlu Review (Maksimal 5) */}
            {reviewList.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-lg py-xs bg-amber-50/70 border-b border-amber-100/60">
                  <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-amber-800 font-[600] flex items-center gap-1.5">
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" className="text-amber-600">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    Perlu Review
                  </span>
                  <span className="font-mono text-[10px] font-[600] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-pill">
                    {reviewList.length} TUGAS
                  </span>
                </div>

                <div className="divide-y divide-hairline-soft">
                  {displayReviewTasks.map((item) => {
                    const taskHref = item.projectId
                      ? `/project/${item.projectId}/task/${item.id}`
                      : `/`;
                    return (
                      <Link
                        key={item.id}
                        href={taskHref}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-sm px-lg py-md hover:bg-amber-50/40 transition-colors group"
                      >
                        {/* Amber status dot */}
                        <div className="w-[8px] h-[8px] rounded-full mt-[5px] flex-shrink-0 bg-amber-500 ring-2 ring-amber-200 group-hover:scale-110 transition-transform" />

                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-[500] text-ink/90 leading-[1.35] truncate group-hover:text-amber-800 transition-colors">
                            {item.title}
                          </p>
                          <div className="flex items-center gap-xs mt-xxs flex-wrap">
                            <span className="font-mono text-[10px] uppercase text-ink/40 font-medium">
                              {item.ticketId}
                            </span>
                            <span className="text-ink/15">·</span>
                            <span className="text-[11px] font-[500] text-amber-700">
                              {item.reviewSubtasksCount && item.reviewSubtasksCount > 0
                                ? `${item.reviewSubtasksCount} subtask review`
                                : "Menunggu review lead"}
                            </span>
                            {item.project && item.project !== "—" && (
                              <>
                                <span className="text-ink/15">·</span>
                                <span className="text-[10px] text-ink/40 truncate max-w-[110px]" title={item.project}>
                                  {item.project}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="inline-flex items-center rounded-pill px-xs py-0.5 text-[9px] font-[600] flex-shrink-0 bg-amber-100 text-amber-800 border border-amber-300">
                          Review
                        </span>
                      </Link>
                    );
                  })}
                </div>

                {reviewList.length > 5 && (
                  <div className="px-lg py-xs bg-amber-50/40 text-center border-t border-amber-100/60">
                    <span className="text-[11px] font-[480] text-amber-800">
                      +{reviewList.length - 5} tugas lainnya menunggu review
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Section: Deadline Mendekati */}
            {urgentTasks.length > 0 && (
              <div>
                {reviewList.length > 0 && (
                  <div className="flex items-center justify-between px-lg py-xs bg-surface-soft/40 border-b border-hairline-soft">
                    <span className="font-mono text-[10px] uppercase tracking-[0.6px] text-ink/60 font-[600]">
                      Deadline Mendekati
                    </span>
                    <span className="font-mono text-[10px] uppercase text-ink/40 font-medium">
                      {urgentTasks.length} TUGAS
                    </span>
                  </div>
                )}

                <div className="divide-y divide-hairline-soft">
                  {urgentTasks.map((info) => {
                    const styles = VARIANT_STYLES[info.variant];
                    const targetHref = info.task.projectId
                      ? `/project/${info.task.projectId}/task/${info.task.id}`
                      : `/project/${info.task.projectId || ""}`;
                    return (
                      <Link
                        key={info.task.id}
                        href={targetHref}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-sm px-lg py-md hover:bg-surface-soft/50 transition-colors"
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
                              {info.task.ticketId?.split("-")[0] || "TASK"}
                            </span>
                            <span className="text-ink/15">·</span>
                            <span className={`text-[11px] font-[540] ${styles.text}`}>
                              {info.label}
                            </span>
                          </div>
                        </div>

                        {/* Priority pill */}
                        {info.task.priority && (
                          <span
                            className={`inline-flex items-center rounded-pill px-[8px] py-[1px] text-[10px] font-medium flex-shrink-0 priority-${info.task.priority}`}
                          >
                            {info.task.priority.charAt(0).toUpperCase() +
                              info.task.priority.slice(1)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-lg py-sm border-t border-hairline-soft bg-surface-soft/30 flex items-center justify-between">
            <span className="text-[11px] font-[320] text-ink/40">
              Klik tugas untuk melihat di papan Kanban
            </span>
            {reviewList.length > 0 && (
              <span className="text-[10px] text-amber-700/80 font-mono font-medium">
                Aktif hingga selesai direview
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
