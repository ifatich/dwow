"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { TASK_COLUMNS } from "@/lib/mock-data";
import { Task, TaskStatus } from "@/lib/types";
import KanbanColumn from "./kanban-column";
import TaskCard from "./task-card";
import ConfirmDialog from "@/components/shared/confirm-dialog";
import KanbanToolbar, { KanbanFilters } from "./kanban-toolbar";
import EvidenceDialog from "@/features/task/components/evidence-dialog";
import ProjectProgressSummary from "@/features/project/components/project-progress-summary";
import { useRealtimeSync, notifyRealtimeSync } from "@/lib/realtime-sync";
import { KanbanSkeleton } from "@/components/shared/skeletons";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

/** Lead can move tasks forward & backward (with evidence) */
const LEAD_TRANSITIONS: Record<string, string[]> = {
  "todo": ["in-progress"],
  "in-progress": ["todo", "done"],
  "done": ["in-progress"],
};

/** Derive task status from subtask states */
function deriveTaskStatus(subtasks: { status: string; done: boolean }[]): string {
  if (subtasks.length === 0) return "todo";
  const allDone = subtasks.every((s) => s.status === "done" || s.done);
  if (allDone) return "done";
  const anyStarted = subtasks.some((s) => s.status !== "to_do");
  return anyStarted ? "in-progress" : "todo";
}

/** Check if a transition is valid */
function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  return LEAD_TRANSITIONS[from]?.includes(to) ?? false;
}

interface KanbanBoardProps {
  projectId?: string;
  currentUser?: string;
}

export default function KanbanBoard({ projectId, currentUser }: KanbanBoardProps) {
  const user = useCurrentUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filters, setFilters] = useState<KanbanFilters>({
    search: "",
    priority: "all",
    assignee: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    taskId: string;
    newStatus: TaskStatus;
    taskTitle: string;
  } | null>(null);
  const [evidenceDialog, setEvidenceDialog] = useState<{
    taskId: string;
    newStatus: TaskStatus;
    taskTitle: string;
  } | null>(null);

  const fetchTasks = useCallback(() => {
    if (!projectId) { setLoading(false); return; }
    fetch(`/api/projects/${projectId}/tasks`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const derived = data.map((t: Task) => ({
            ...t,
            status: deriveTaskStatus(t.subtasks || []) as TaskStatus,
          }));
          setTasks(derived);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  useRealtimeSync(fetchTasks, 5000);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStatusChangeRequest = (taskId: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!canTransition(task.status, newStatus)) {
      showToast("⛔ Perpindahan status tidak diizinkan");
      return;
    }

    // Batasi Done: Hanya Lead / Admin yang bisa menyelesaikan task
    const userRole = user?.role;
    const currentUsername = user?.username || currentUser;
    const isLeadOrAdmin =
      userRole === "lead" ||
      userRole === "kadep" ||
      userRole === "kadiv" ||
      userRole === "super_admin" ||
      currentUsername?.toLowerCase() === "admin" ||
      (currentUsername && task.lead?.toLowerCase() === currentUsername?.toLowerCase());

    if (newStatus === "done" && !isLeadOrAdmin) {
      showToast("⛔ Hanya Lead / Admin yang dapat menyelesaikan task");
      return;
    }

    if (newStatus === "done") {
      const allSubtasksDone = task.subtasks.every((s) => s.status === "done");
      if (!allSubtasksDone) {
        const pending = task.subtasks.filter((s) => s.status !== "done").length;
        showToast(`⛔ Tidak bisa Done — ${pending} subtask belum selesai`);
        return;
      }
    }

    setConfirmDialog({
      taskId,
      newStatus,
      taskTitle: task.title,
    });
  };

  const handleConfirmTransition = () => {
    if (!confirmDialog) return;
    applyTaskMove(confirmDialog.taskId, confirmDialog.newStatus, "");
    setConfirmDialog(null);
  };

  const handleEvidenceSubmit = async (evidence: string) => {
    if (!evidenceDialog) return;
    await applyTaskMove(evidenceDialog.taskId, evidenceDialog.newStatus, evidence);
    setEvidenceDialog(null);
  };

  const applyTaskMove = async (taskId: string, newStatus: TaskStatus, evidence: string) => {
    // Simpan state lama
    const previousTasks = [...tasks];
    
    // Update UI immediately
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    // Persist to backend
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, evidence }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Gagal mengubah status");
      }
      
      const labels: Record<string, string> = {
        "todo": "To Do", "in-progress": "In Progress", "review": "Review", "done": "Done",
      };
      showToast(`✅ Task dipindahkan ke ${labels[newStatus] || newStatus}`);
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
      // Revert UI if API fails
      setTasks(previousTasks);
    }
  };

  // Tasks are auto-derived — no manual drag needed, sensors disabled
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Drag handlers — only for lead
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over?.id as TaskStatus | undefined;
    setOverColumn(over || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setOverColumn(null);
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (!canTransition(task.status, newStatus)) {
      showToast("⛔ Perpindahan status tidak diizinkan");
      return;
    }

    // Evidence hanya untuk backward moves
    const statusOrder = ["todo", "in-progress", "done"];
    const isBackward = statusOrder.indexOf(newStatus) < statusOrder.indexOf(task.status);
    if (isBackward) {
      setEvidenceDialog({ taskId, newStatus, taskTitle: task.title });
      return;
    }

    // Forward moves — simple confirm
    setConfirmDialog({ taskId, newStatus, taskTitle: task.title });
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setOverColumn(null);
  };

  // Apply filters to tasks
  const filteredTasks = tasks.filter((task) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchTicket = task.ticketId.toLowerCase().includes(q);
      const matchAssignee = task.subtasks.some((s) =>
        s.assignees.some((a) => a.toLowerCase().includes(q))
      );
      const matchPic = task.picName.toLowerCase().includes(q);
      if (!matchTitle && !matchTicket && !matchAssignee && !matchPic) return false;
    }
    if (filters.priority !== "all" && task.priority !== filters.priority) {
      return false;
    }
    if (filters.assignee && !task.subtasks.some((s) =>
      s.assignees.includes(filters.assignee)
    )) {
      return false;
    }
    return true;
  });

  // Extract unique assignees from subtask_assignees (NOT task.picName)
  const uniqueAssignees = Array.from(
    new Set(tasks.flatMap((t) => t.subtasks.flatMap((s) => s.assignees)))
  ).sort();

  const getTasksByStatus = useCallback(
    (status: TaskStatus) =>
      filteredTasks.filter((t) => t.status === status),
    [filteredTasks]
  );

  return (
    <div className="flex flex-col flex-1">
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

      {/* Kanban board with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-xl py-lg">
            {/* Project Progress Summary Chart */}
            {!loading && <ProjectProgressSummary tasks={tasks} />}

            {/* Toolbar: search & filter */}
            <div className="mb-lg">
              <KanbanToolbar
                filters={filters}
                onFiltersChange={setFilters}
                assignees={uniqueAssignees}
              />
            </div>

            {loading ? (
              <KanbanSkeleton />
            ) : (
            <div className="flex gap-lg items-start pb-lg kanban-scroll md:overflow-x-visible">
              {TASK_COLUMNS.map((column) => {
                const isInvalidDrop = !!(
                  overColumn === column.id &&
                  activeTask &&
                  !canTransition(activeTask.status, column.id)
                );
                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={getTasksByStatus(column.id)}
                    isInvalidDrop={isInvalidDrop}
                    isActiveDrag={!!activeTask}
                    currentUser={currentUser}
                  />
                );
              })}
            </div>
            )}
          </div>
        </div>

        {/* Drag overlay — the floating card while dragging */}
        <DragOverlay>
          {activeTask ? (
            <div className="opacity-90 scale-105 rotate-[2deg]">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={!!confirmDialog}
        title="Konfirmasi Perpindahan Status"
        message={
          confirmDialog
            ? `Pindahkan tugas "${confirmDialog.taskTitle}" ke status ${
                (() => {
                  const labels: Record<string, string> = {
                    "in-progress": "In Progress",
                    review: "Review",
                    done: "Done",
                  };
                  return labels[confirmDialog.newStatus] || confirmDialog.newStatus;
                })()
              }?${
                confirmDialog.newStatus === "in-progress"
                  ? " Timer akan mulai otomatis."
                  : confirmDialog.newStatus === "done"
                    ? " Pastikan semua subtask 100% selesai."
                    : ""
              }`
            : ""
        }
        confirmLabel="Ya, Pindahkan"
        cancelLabel="Batal"
        variant={confirmDialog?.newStatus === "done" ? "default" : "default"}
        onConfirm={handleConfirmTransition}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Evidence dialog for lead task moves */}
      <EvidenceDialog
        open={!!evidenceDialog}
        subtaskTitle={evidenceDialog?.taskTitle || ""}
        targetLabel={evidenceDialog?.newStatus === "done" ? "Done" : evidenceDialog?.newStatus === "todo" ? "To Do" : "In Progress"}
        onConfirm={handleEvidenceSubmit}
        onCancel={() => setEvidenceDialog(null)}
      />
    </div>
  );
}
