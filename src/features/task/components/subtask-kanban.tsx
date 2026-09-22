"use client";

import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  useDraggable,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Subtask, SubtaskStatus } from "@/lib/types";
import type { ActivityLogEntry, StaffTimeContribution } from "@/lib/types";
import { STAFF_COLORS } from "./staff-time-summary";
import StaffTimeSummary from "./staff-time-summary";
import EvidenceDialog from "@/features/task/components/evidence-dialog";
import SubtaskDetailModal from "@/features/task/components/subtask-detail-modal";
import StaffAssignmentHistoryDialog from "@/features/task/components/staff-assignment-history-dialog";
import { useTimerCountdown } from "@/features/task/hooks/use-timer-countdown";
import { notifyRealtimeSync } from "@/lib/realtime-sync";

const SUBTASK_COLUMNS: { id: SubtaskStatus; label: string; accent: string }[] = [
  { id: "to_do", label: "To Do", accent: "bg-hairline" },
  { id: "in_progress", label: "In Progress", accent: "bg-blue-500" },
  { id: "review", label: "Review", accent: "bg-amber-500" },
  { id: "done", label: "Done", accent: "bg-green-500" },
];

const STATUS_LABEL: Record<string, string> = {
  to_do: "To Do", in_progress: "In Progress", review: "Review", done: "Done",
};

/** Allowed actions per subtask status — forward flow only for Staff */
const SUBTASK_ACTIONS: Record<SubtaskStatus, { to: SubtaskStatus; label: string; icon: string; variant: string }[]> = {
  to_do: [{ to: "in_progress", label: "Mulai", icon: "play", variant: "blue" }],
  in_progress: [{ to: "review", label: "Ajukan Review", icon: "send", variant: "amber" }],
  review: [
    { to: "done", label: "Setujui", icon: "check", variant: "green" },
    { to: "in_progress", label: "Revisi", icon: "refresh", variant: "red" },
  ],
  done: [],
};

const ICON_SVG: Record<string, string> = {
  play: "M3 1l14 7L3 15V1z",
  send: "M1 1l16 7-16 7 4-7-4-7z",
  check: "M2 6l3 3 6-6",
  refresh: "M14 8a6 6 0 01-6 6 6 6 0 01-6-6 6 6 0 016-6v2M14 8h-4M14 8V4",
};

interface SubtaskCardViewProps {
  subtask: Subtask;
  onAction?: (subtaskId: string, newStatus: SubtaskStatus) => void;
  onOpenDetail?: (subtask: Subtask) => void;
  onOpenHistory?: (subtask: Subtask) => void;
  pending?: boolean;
  isDragging?: boolean;
  showLeadActions?: boolean;
  currentUser?: string;
}

function SubtaskCardView({
  subtask,
  onAction,
  onOpenDetail,
  onOpenHistory,
  pending,
  isDragging,
  showLeadActions,
  currentUser,
}: SubtaskCardViewProps) {
  const isDone = subtask.status === "done";
  const isReview = subtask.status === "review";
  const isInProgress = subtask.status === "in_progress";
  const isAssigned = !currentUser || subtask.assignees.some((a) => a.toLowerCase() === currentUser.toLowerCase());
  const actions = SUBTASK_ACTIONS[subtask.status] || [];
  const visibleActions = subtask.status === "review" && showLeadActions ? actions
    : !isAssigned ? []
      : subtask.status === "review" ? []
        : actions;

  // Cek apakah subtask ditugaskan ke user yang sedang login
  const normalizedUser = currentUser?.trim().toLowerCase();
  const isMySubtask = normalizedUser
    ? subtask.assignees.some((a) => a.toLowerCase() === normalizedUser)
    : false;

  const assigneeSet = new Set(subtask.assignees.map((a) => a.toLowerCase()));
  const validTimeContribs = subtask.timeContributions.filter((tc) => assigneeSet.has(tc.staffName.toLowerCase()));

  const accumulatedMinutes = validTimeContribs.length > 0
    ? Math.max(...validTimeContribs.map((tc) => Math.round(tc.hours * 60)))
    : 0;

  const timer = useTimerCountdown(subtask.workloadHours, isInProgress, subtask.activityLog, accumulatedMinutes);
  const cleanedSubtask = { ...subtask, timeContributions: validTimeContribs };

  return (
    <div
      className={`rounded-md overflow-hidden transition-all duration-200 ${isDragging
        ? "bg-canvas shadow-lg border border-ink/20"
        : isMySubtask
          ? "bg-canvas border-2 border-lime-500"
          : isDone
            ? "bg-canvas border border-green-200/60"
            : isReview
              ? "bg-canvas border border-amber-200/60"
              : "bg-canvas border border-hairline hover:border-ink/20 hover:shadow-sm"
        }`}
    >
      <div className="flex items-center gap-sm px-md py-sm">
        <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? "bg-semantic-success border-semantic-success" : isReview ? "border-amber-400 bg-amber-50" : "border-hairline"}`}>
          {isDone && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          {isReview && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="1.5" fill="#f59e0b" /></svg>}
        </div>
        <div className="flex items-center gap-xs flex-1 min-w-0">
          <span className={`text-[14px] leading-[1.45] truncate ${isDone ? "text-ink/40 line-through" : "text-ink/80"}`}>{subtask.title}</span>
        </div>
        {subtask.assignees.length > 0 && (
          <div className="flex -space-x-xxs flex-shrink-0">
            {subtask.assignees.map((name, idx) => {
              const isUser = normalizedUser && name.toLowerCase() === normalizedUser;
              return (
                <div
                  key={name}
                  className={`w-[20px] h-[20px] rounded-full flex items-center justify-center border border-canvas transition-all ${isUser
                    ? "ring-1 ring-primary/50 font-bold z-20"
                    : idx === 0 && subtask.assignees.length > 1
                      ? "ring-1 ring-primary/40 z-10"
                      : ""
                    }`}
                  style={{ backgroundColor: STAFF_COLORS[name] || "#6b7280" }}
                  title={
                    subtask.assignees.length === 1
                      ? `${name} (Assignee)`
                      : idx === 0
                        ? `${name} (Owner)`
                        : `${name} (Co-assignee)`
                  }
                >
                  <span className="text-[7px] font-[540] text-white leading-none">{name.slice(0, 2).toUpperCase()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="px-md pb-xs"><StaffTimeSummary subtask={cleanedSubtask} /></div>

      {/* Timer countdown — hanya saat in_progress */}
      {isInProgress && subtask.workloadHours > 0 && (
        <div className="px-md pb-xs">
          <div className={`flex items-center gap-xs rounded-md px-sm py-xxs text-[10px] font-[480] ${timer.isOverdue
            ? "bg-red-50 text-red-600 border border-red-200"
            : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={timer.isOverdue ? "animate-pulse" : ""}>
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
              <path d="M5 2.5V5L6.5 6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span>⏱ {timer.display}</span>
            <span className="opacity-40">/</span>
            <span>est {subtask.workloadHours}j</span>
            {timer.isOverdue && (
              <span className="ml-auto rounded-pill bg-red-600 text-white px-xs text-[9px] font-[540]">
                Overdue
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons & Detail Button */}
      <div className="px-md pb-sm pt-xs flex items-center justify-between gap-xs flex-wrap border-t border-hairline-soft/40 mt-xs">
        <div className="flex items-center gap-xs">
          {visibleActions.map((a) => (
            <span
              key={a.to}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (!pending) onAction?.(subtask.id, a.to);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!pending) onAction?.(subtask.id, a.to); }
              }}
              className={`inline-flex items-center gap-xxs rounded-pill px-sm py-xxs text-[10px] font-[480] transition-colors select-none ${pending ? "opacity-50 cursor-wait"
                : "cursor-pointer"
                } ${a.variant === "green" ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : a.variant === "red" ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    : a.variant === "amber" ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
            >
              {pending ? (
                <svg width="10" height="10" viewBox="0 0 18 18" fill="none" className="animate-spin">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="28" strokeDashoffset="8" fill="none" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 18 18" fill="none">
                  <path d={ICON_SVG[a.icon]} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill={a.icon === "play" ? "currentColor" : "none"} />
                </svg>
              )}
              {pending ? "Memproses..." : a.label}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-xs">
          {/* Trigger staff assignment history modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory?.(subtask);
            }}
            className="inline-flex items-center gap-xxs rounded-pill px-xs py-xxs text-[10px] font-[480] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
            title="Lihat Histori Penugasan Staf"
          >
            Histori Tim
          </button>

          {/* Trigger detail modal */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail?.(subtask);
            }}
            className="inline-flex items-center gap-xxs rounded-pill px-sm py-xxs text-[10px] font-[480] bg-surface-soft text-ink/60 hover:bg-hairline hover:text-ink transition-colors cursor-pointer border border-hairline-soft"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="opacity-70">
              <path d="M1 6s2.5-4 5-4 5 4 5 4-2.5 4-5 4-5-4-5-4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Detail
          </button>
        </div>
      </div>
    </div>
  );
}

function DraggableSubtask({
  subtask,
  onAction,
  onOpenDetail,
  onOpenHistory,
  pending,
  currentUser,
  showLeadActions,
}: {
  subtask: Subtask;
  onAction?: (subtaskId: string, newStatus: SubtaskStatus) => void;
  onOpenDetail?: (subtask: Subtask) => void;
  onOpenHistory?: (subtask: Subtask) => void;
  pending?: boolean;
  currentUser?: string;
  showLeadActions?: boolean;
}) {
  const isAssigned = !!currentUser && subtask.assignees.some((a) => a.toLowerCase() === currentUser.toLowerCase());
  const canDrag = isAssigned || showLeadActions;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: subtask.id,
    data: { subtask },
    disabled: !canDrag,
  });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: isDragging ? 50 : undefined } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...(canDrag ? listeners : {})} {...(canDrag ? attributes : {})} suppressHydrationWarning className={`${canDrag ? "touch-none cursor-grab active:cursor-grabbing" : "cursor-default"} ${isDragging ? "opacity-40" : ""}`}>
      <SubtaskCardView
        subtask={subtask}
        onAction={onAction}
        onOpenDetail={onOpenDetail}
        onOpenHistory={onOpenHistory}
        pending={pending}
        showLeadActions={showLeadActions}
        currentUser={currentUser}
      />
    </div>
  );
}

function DroppableColumn({
  columnId,
  label,
  accent,
  subtasks,
  onAction,
  onOpenDetail,
  onOpenHistory,
  pendingIds,
  currentUser,
  showLeadActions,
}: {
  columnId: string;
  label: string;
  accent: string;
  subtasks: Subtask[];
  onAction?: (subtaskId: string, newStatus: SubtaskStatus) => void;
  onOpenDetail?: (subtask: Subtask) => void;
  onOpenHistory?: (subtask: Subtask) => void;
  pendingIds?: Set<string>;
  currentUser?: string;
  showLeadActions?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div className="flex flex-col flex-1 min-w-[240px]">
      <div className="bg-surface-soft/50 rounded-t-lg">
        <div className={`h-[3px] ${accent} rounded-t-lg`} />
        <div className="flex items-center justify-between px-lg py-md">
          <h3 className="text-[16px] font-[540] leading-[1.35] text-ink">{label}</h3>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-canvas border border-hairline text-[11px] font-[450] text-ink/50">{subtasks.length}</span>
        </div>
      </div>
      <div ref={setNodeRef} className={`flex-1 p-sm space-y-sm min-h-[300px] rounded-b-lg border border-t-0 border-hairline-soft transition-colors ${isOver ? "bg-surface-soft/60" : "bg-canvas/40"}`}>
        {subtasks.map((sub) => (
          <DraggableSubtask
            key={sub.id}
            subtask={sub}
            onAction={onAction}
            onOpenDetail={onOpenDetail}
            onOpenHistory={onOpenHistory}
            pending={pendingIds?.has(sub.id)}
            currentUser={currentUser}
            showLeadActions={showLeadActions}
          />
        ))}
      </div>
    </div>
  );
}

/** Hitung kontribusi waktu dari activity log (durasi > 0) khusus assignee */
function computeTimeContributionsFromLogs(logs: ActivityLogEntry[], assignees: string[] = []): StaffTimeContribution[] {
  const assigneeSet = new Set(assignees.map((a) => a.toLowerCase()));
  const map = new Map<string, number>();
  for (const entry of logs) {
    if (entry.durationHours > 0 && entry.staffName) {
      if (assigneeSet.size === 0 || assigneeSet.has(entry.staffName.toLowerCase())) {
        map.set(entry.staffName, (map.get(entry.staffName) ?? 0) + entry.durationHours);
      }
    }
  }
  return Array.from(map.entries()).map(([staffName, hours]) => ({
    staffName,
    hours: Math.round(hours * 10) / 10,
  }));
}

interface SubtaskKanbanProps {
  subtasks: Subtask[];
  onSubtasksChange: (subtasks: Subtask[]) => void;
  currentUser?: string;
  userRole?: string;
  taskLead?: string;
}

export default function SubtaskKanban({
  subtasks,
  onSubtasksChange,
  currentUser,
  userRole,
  taskLead,
}: SubtaskKanbanProps) {
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);
  const [evidenceTarget, setEvidenceTarget] = useState<{ subtask: Subtask; targetColumn: SubtaskStatus } | null>(null);
  const [detailSubtask, setDetailSubtask] = useState<Subtask | null>(null);
  const [historySubtask, setHistorySubtask] = useState<Subtask | null>(null);
  const [timerPending, _setTimerPending] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleReassignStaff = async (newAssignees: string[], reason: string) => {
    if (!historySubtask) return;
    const previousAssignees = historySubtask.assignees;

    try {
      await fetch(`/api/subtasks/${historySubtask.id}/assignment-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          previousAssignees,
          newAssignees,
          changedBy: currentUser || "Lead",
          changeType: "reassigned",
          reason,
        }),
      });
    } catch (err) {
      console.error("Failed to record assignment history", err);
    }

    const updatedSubtasks = subtasks.map((s) => {
      if (s.id === historySubtask.id) {
        return { ...s, assignees: newAssignees };
      }
      return s;
    });
    onSubtasksChange(updatedSubtasks);
    setHistorySubtask({ ...historySubtask, assignees: newAssignees });
    showToast("✅ Berhasil memperbarui penugasan staf!");
  };

  const [filters, setFilters] = useState<{ search: string; assignee: string }>({
    search: "",
    assignee: "",
  });

  const uniqueAssignees = Array.from(
    new Set(subtasks.flatMap((s) => s.assignees))
  ).sort();

  const filteredSubtasks = subtasks.filter((s) => {
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchDesc = s.description?.toLowerCase().includes(q);
      const matchAssignee = s.assignees.some((a) => a.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    if (filters.assignee && !s.assignees.some((a) => a.toLowerCase() === filters.assignee.toLowerCase())) {
      return false;
    }
    return true;
  });

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor));
  const getByStatus = useCallback((status: SubtaskStatus) => filteredSubtasks.filter((s) => s.status === status), [filteredSubtasks]);
  const showLeadActions =
    userRole === "lead" ||
    userRole === "kadep" ||
    userRole === "kadiv" ||
    userRole === "super_admin" ||
    currentUser?.toLowerCase() === "admin" ||
    currentUser?.toLowerCase() === taskLead?.toLowerCase();

  /** Ambil nama staff efektif (currentUser > localStorage > assignee > admin) */
  const getEffectiveUser = (subtask: Subtask): string => {
    if (currentUser && currentUser.trim()) return currentUser.trim();
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("taskflow_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.username) return parsed.username;
        }
      } catch {}
    }
    return subtask.assignees[0] || "admin";
  };

  const handleDragStart = (event: DragStartEvent) => {
    const sub = subtasks.find((s) => s.id === event.active.id);
    if (sub) setActiveSubtask(sub);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSubtask(null);
    const { active, over } = event;
    if (!over) return;
    const subtaskId = active.id as string;
    const targetColumn = over.id as SubtaskStatus;
    if (!["to_do", "in_progress", "review", "done"].includes(targetColumn)) return;

    const subtask = subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;
    if (subtask.status === targetColumn) return;

    // Aturan: Hanya Lead / Super Admin / Kadep / Kadiv yang dapat mengubah status ke 'done'
    const isLeadOrAdmin =
      userRole === "lead" ||
      userRole === "kadep" ||
      userRole === "kadiv" ||
      userRole === "super_admin" ||
      currentUser?.toLowerCase() === "admin" ||
      currentUser?.toLowerCase() === taskLead?.toLowerCase();

    if (targetColumn === "done" && !isLeadOrAdmin) {
      showToast("⛔ Hanya Lead yang dapat menyetujui subtask menjadi Done.");
      return;
    }

    if (targetColumn === "done" && subtask.status !== "review" && userRole !== "super_admin" && currentUser?.toLowerCase() !== "admin") {
      showToast("⛔ Subtask tidak dapat langsung diselesaikan. Subtask wajib diajukan ke Review terlebih dahulu.");
      return;
    }

    // Evidence hanya: in_progress → review, dan semua backward moves
    const statusOrder: SubtaskStatus[] = ["to_do", "in_progress", "review", "done"];
    const isBackward = statusOrder.indexOf(targetColumn) < statusOrder.indexOf(subtask.status);
    const isForwardToReview = subtask.status === "in_progress" && targetColumn === "review";

    if (isBackward || isForwardToReview) {
      setEvidenceTarget({ subtask, targetColumn });
      return;
    }

    // Forward moves (to_do→in_progress, review→done) — no evidence
    await applySubtaskMove(subtaskId, targetColumn);
  };

  const applySubtaskMove = async (subtaskId: string, newStatus: SubtaskStatus, evidence?: string) => {
    const subtask = subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    const isLeadOrAdmin =
      userRole === "lead" ||
      userRole === "kadep" ||
      userRole === "kadiv" ||
      userRole === "super_admin" ||
      currentUser?.toLowerCase() === "admin" ||
      currentUser?.toLowerCase() === taskLead?.toLowerCase();

    if (newStatus === "done" && !isLeadOrAdmin) {
      showToast("⛔ Hanya Lead yang dapat menyetujui subtask menjadi Done.");
      return;
    }

    if (newStatus === "done" && subtask.status !== "review" && userRole !== "super_admin" && currentUser?.toLowerCase() !== "admin") {
      showToast("⛔ Subtask tidak dapat langsung diselesaikan. Subtask wajib diajukan ke Review terlebih dahulu.");
      return;
    }

    // Simpan state lama
    const previousSubtasks = [...subtasks];

    // Optimistic UI update for smoothness (basic status change, no logs yet)
    onSubtasksChange(subtasks.map((s) => s.id === subtaskId ? { ...s, status: newStatus } : s));

    // Save to backend API
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          staffName: getEffectiveUser(subtask),
          ...(evidence !== undefined && { evidence })
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal update status subtask");
      }

      const responseData = await res.json().catch(() => ({}));

      // Server sudah menangani timer start/stop & mencatat durasi di activity_logs.
      // Response: { subtask, task, activityLog, timeContributions }.
      const apiLogs: ActivityLogEntry[] = responseData?.activityLog || [];
      const apiTimeContribs: StaffTimeContribution[] = responseData?.timeContributions || [];

      const updated = previousSubtasks.map((s) => {
        if (s.id !== subtaskId) return s;
        // Prioritaskan timeContributions dari response (akurat dari DB, per assignee)
        const assigneeSet = new Set(s.assignees.map((a) => a.toLowerCase()));
        const rawContribs = apiTimeContribs.length > 0
          ? apiTimeContribs
          : apiLogs.length > 0
            ? computeTimeContributionsFromLogs(apiLogs, s.assignees)
            : s.timeContributions;
        const computedContributions = rawContribs.filter((tc) => assigneeSet.has(tc.staffName.toLowerCase()));

        return {
          ...s,
          status: newStatus,
          done: newStatus === "done",
          ...(evidence !== undefined && { evidence }),
          activityLog: apiLogs.length > 0 ? apiLogs : s.activityLog,
          timeContributions: computedContributions,
        };
      });
      onSubtasksChange(updated);
      notifyRealtimeSync();
    } catch (error: any) {
      console.error("Gagal update status subtask", error);
      showToast(`⛔ ${error.message}`);
      // Revert to previous state
      onSubtasksChange(previousSubtasks);
    }
  };

  const handleEvidenceConfirm = async (evidence: string) => {
    if (!evidenceTarget) return;
    const { subtask: target, targetColumn } = evidenceTarget;
    setEvidenceTarget(null);

    await applySubtaskMove(target.id, targetColumn, evidence);
  };

  const handleSubtaskAction = async (subtaskId: string, newStatus: SubtaskStatus) => {
    const subtask = subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    // Evidence: in_progress → review, dan semua backward moves
    const statusOrder: SubtaskStatus[] = ["to_do", "in_progress", "review", "done"];
    const isBackward = statusOrder.indexOf(newStatus) < statusOrder.indexOf(subtask.status);
    const isForwardToReview = subtask.status === "in_progress" && newStatus === "review";

    if (isBackward || isForwardToReview) {
      setEvidenceTarget({ subtask, targetColumn: newStatus });
      return;
    }

    await applySubtaskMove(subtaskId, newStatus);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Subtask Toolbar: Search & Assignee filter */}
      <div className="flex items-center gap-md flex-wrap mb-md">
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-sm top-1/2 -translate-y-1/2 text-ink/25"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Cari subtask..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full h-[40px] pl-xxl pr-md rounded-md border border-hairline bg-canvas text-[14px] font-[450] text-ink placeholder:text-ink/30 focus:outline-none focus:border-ink/30 transition-colors"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
              className="absolute right-sm top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-soft flex items-center justify-center hover:bg-hairline transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        {uniqueAssignees.length > 0 && (
          <select
            value={filters.assignee}
            onChange={(e) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
            className="h-[40px] px-md rounded-md border border-hairline bg-canvas text-[14px] font-[450] text-ink focus:outline-none focus:border-ink/30 transition-colors cursor-pointer appearance-none pr-xxl"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23000' stroke-opacity='0.4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            <option value="">Semua Staff</option>
            {uniqueAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}

        {(filters.search || filters.assignee) && (
          <button
            type="button"
            onClick={() => setFilters({ search: "", assignee: "" })}
            className="h-[32px] rounded-pill px-sm text-[12px] font-[480] text-ink/40 hover:text-ink/60 hover:bg-surface-soft transition-colors"
          >
            Reset Filter
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveSubtask(null)}>
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed bottom-lg left-1/2 -translate-x-1/2 z-[60] animate-slide-up">
            <div className="bg-primary text-on-primary text-[14px] font-[450] px-lg py-sm rounded-pill shadow-lg flex items-center gap-sm">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v4M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {toastMessage}
            </div>
          </div>
        )}

        <div className="flex gap-lg items-start">
          {SUBTASK_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              columnId={col.id}
              label={col.label}
              accent={col.accent}
              subtasks={getByStatus(col.id)}
              onAction={handleSubtaskAction}
              onOpenDetail={(s) => setDetailSubtask(s)}
              onOpenHistory={(s) => setHistorySubtask(s)}
              pendingIds={timerPending}
              currentUser={currentUser}
              showLeadActions={showLeadActions}
            />
          ))}
        </div>
        <DragOverlay>
          {activeSubtask ? (
            <div className="opacity-90 scale-105 rotate-[1deg] w-[300px]">
              <SubtaskCardView
                subtask={activeSubtask}
                isDragging
                currentUser={currentUser}
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Evidence dialog */}
        <EvidenceDialog
          open={!!evidenceTarget}
          subtaskTitle={evidenceTarget?.subtask.title || ""}
          targetLabel={STATUS_LABEL[evidenceTarget?.targetColumn || ""]}
          onConfirm={handleEvidenceConfirm}
          onCancel={() => setEvidenceTarget(null)}
        />

        {/* Subtask detail modal */}
        <SubtaskDetailModal
          open={!!detailSubtask}
          subtask={detailSubtask}
          onClose={() => setDetailSubtask(null)}
        />

        {/* Staff Assignment History Dialog */}
        <StaffAssignmentHistoryDialog
          open={!!historySubtask}
          subtaskTitle={historySubtask?.title || ""}
          subtaskId={historySubtask?.id || ""}
          currentAssignees={historySubtask?.assignees || []}
          assignmentHistory={historySubtask?.assignmentHistory}
          taskLead={taskLead}
          onClose={() => setHistorySubtask(null)}
          onReassign={handleReassignStaff}
        />
      </DndContext>
    </div>
  );
}
