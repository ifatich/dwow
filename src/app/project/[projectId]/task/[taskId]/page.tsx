"use client";

import { useState, use, useEffect } from "react";
import { Subtask } from "@/lib/types";
import SubtaskKanban from "@/features/task/components/subtask-kanban";
import MetadataSection from "@/features/task/components/metadata-section";
import DeadlineNotification from "@/components/shared/deadline-notification";
import ConsolidatedActivityFeed from "@/features/task/components/consolidated-activity-feed";
import PageHeader, { HeaderAvatar } from "@/components/shared/page-header";
import BreadcrumbBar from "@/components/shared/breadcrumb-bar";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { TaskDetailSkeleton } from "@/components/shared/skeletons";

interface TaskDetailPageProps {
  params: Promise<{ projectId: string; taskId: string }>;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDeadlineStatus(deadline: string, status: string): { label: string; cls: string } | null {
  if (status === "done") return { label: "Selesai", cls: "bg-green-50 text-green-600" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Terlambat ${Math.abs(diff)} hari`, cls: "bg-red-50 text-red-600" };
  if (diff === 0) return { label: "Hari ini", cls: "bg-amber-50 text-amber-700" };
  if (diff <= 3) return { label: `${diff} hari lagi`, cls: "bg-amber-50 text-amber-600" };
  return null;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { projectId, taskId } = use(params);
  const currentUser = useCurrentUser();
  const [task, setTask] = useState<any>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.id) {
          setTask(data);
          setSubtasks(data.subtasks || []);
        }
      })
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) {
    return (
      <div className="flex flex-col flex-1">
        <PageHeader><HeaderAvatar /></PageHeader>
        <main className="flex-1"><TaskDetailSkeleton /></main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col flex-1">
        <header className="sticky top-0 z-10 bg-canvas border-b border-hairline">
          <div className="max-w-[1280px] mx-auto px-xl h-[56px] flex items-center">
            <a href="/" className="text-[14px] font-[480] text-ink/50 hover:text-ink transition-colors">
              ← Kembali ke Dashboard
            </a>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-ink/40">Task tidak ditemukan.</p>
        </main>
      </div>
    );
  }

  const completed = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;
  const deadlineInfo = getDeadlineStatus(task.deadline, task.status);

  return (
    <div className="flex flex-col flex-1">
      <PageHeader>
        <DeadlineNotification tasks={[task]} />
        <HeaderAvatar />
      </PageHeader>

      <BreadcrumbBar
        items={[
          { label: "Dashboard", href: "/" },
          { label: task.project, href: `/project/${task.projectId || projectId}` },
          { label: task.title },
        ]}
      />

      <main className="flex-1 overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-xl py-lg">
          {/* Task info header */}
          <div className="mb-lg">
            <div className="flex items-center gap-md flex-wrap mb-sm">
              <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/50">
                {task.ticketId}
              </span>
              <span className={`inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-medium priority-${task.priority}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              {deadlineInfo && (
                <span className={`inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-[540] ${deadlineInfo.cls}`}>
                  {deadlineInfo.label}
                </span>
              )}
            </div>
            <h1 className="text-[26px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink">
              {task.title}
            </h1>
            <div className="flex items-center gap-md mt-sm text-[14px] text-ink/50">
              <span>PIC: <strong className="text-ink/70 capitalize">{task.picName}</strong></span>
              <span>Lead: <strong className="text-ink/70 capitalize">{task.lead}</strong></span>
              <span>Deadline: <strong className="text-ink/70">{formatDate(task.deadline)}</strong></span>
            </div>

            {/* Metadata — description/goals/dod */}
            <MetadataSection
              description={task.description}
              goals={task.goals}
              dod={task.dod}
            />

            {/* Progress */}
            <div className="flex items-center gap-sm mt-md">
              <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/40">Progress Subtask</span>
              <span className="text-[13px] font-[540] text-ink/70">{completed}/{total}</span>
              <div className="w-[120px] h-[4px] bg-surface-soft rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          {/* Consolidated activity feed */}
          <div className="mb-lg">
            <ConsolidatedActivityFeed subtasks={subtasks} />
          </div>

          {/* Subtask Kanban */}
          <div>
            <h2 className="text-[18px] font-[540] leading-[1.35] tracking-[-0.26px] text-ink mb-md">
              Papan Subtask
            </h2>
            <SubtaskKanban subtasks={subtasks} onSubtasksChange={setSubtasks} currentUser={currentUser?.username} userRole={currentUser?.role} taskLead={task.lead} />
          </div>
        </div>
      </main>
    </div>
  );
}
