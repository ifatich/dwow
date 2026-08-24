"use client";

import { Task } from "@/lib/types";

interface ProjectProgressSummaryProps {
  tasks: Task[];
}

export default function ProjectProgressSummary({ tasks }: ProjectProgressSummaryProps) {
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const reviewTasks = tasks.filter((t) => t.status === "review").length;
  const inProgressTasks = tasks.filter((t) => (t.status as string) === "in-progress" || (t.status as string) === "in_progress").length;
  const todoTasks = tasks.filter((t) => (t.status as string) === "todo" || (t.status as string) === "to_do").length;
  const taskProgressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const allSubtasks = tasks.flatMap((t) => t.subtasks || []);
  const totalSubtasks = allSubtasks.length;
  const doneSubtasks = allSubtasks.filter((s) => s.status === "done" || s.done).length;
  const reviewSubtasks = allSubtasks.filter((s) => s.status === "review").length;
  const inProgressSubtasks = allSubtasks.filter((s) => s.status === "in_progress").length;
  const todoSubtasks = allSubtasks.filter((s) => s.status === "to_do").length;
  const subtaskProgressPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  // Calculate percentages for stacked progress bar
  const getPct = (val: number, total: number) => (total > 0 ? (val / total) * 100 : 0);

  const taskPctDone = getPct(doneTasks, totalTasks);
  const taskPctReview = getPct(reviewTasks, totalTasks);
  const taskPctInProgress = getPct(inProgressTasks, totalTasks);
  const taskPctTodo = getPct(todoTasks, totalTasks);

  const subPctDone = getPct(doneSubtasks, totalSubtasks);
  const subPctReview = getPct(reviewSubtasks, totalSubtasks);
  const subPctInProgress = getPct(inProgressSubtasks, totalSubtasks);
  const subPctTodo = getPct(todoSubtasks, totalSubtasks);

  if (totalTasks === 0) return null;

  return (
    <div className="bg-canvas border border-hairline rounded-lg p-lg mb-lg shadow-xs transition-shadow hover:shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-md border-b border-hairline-soft pb-sm">
        <div className="flex items-center gap-xs">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-primary">
            <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 12v-3M9 12V6M12 12V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h3 className="text-[16px] font-[540] text-ink">Progress Proyek (Akumulasi)</h3>
        </div>
        <div className="flex items-center gap-sm">
          <span className="text-[12px] font-[450] text-ink/50">Overall Subtask Progress</span>
          <span className="inline-flex items-center rounded-pill px-md py-xxs bg-green-50 text-green-700 text-[12px] font-[540] border border-green-200">
            {subtaskProgressPct}% Selesai
          </span>
        </div>
      </div>

      {/* Progress Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Task Level Progress */}
        <div className="bg-surface-soft/40 border border-hairline-soft rounded-md p-md">
          <div className="flex items-center justify-between mb-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/50">Akumulasi Task</span>
            <span className="text-[14px] font-[540] text-ink">
              {doneTasks}/{totalTasks} Task <span className="text-ink/40">({taskProgressPct}%)</span>
            </span>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-[10px] w-full bg-hairline-soft rounded-full overflow-hidden flex my-sm">
            {taskPctDone > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${taskPctDone}%` }} title={`Done: ${doneTasks}`} />}
            {taskPctReview > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${taskPctReview}%` }} title={`Review: ${reviewTasks}`} />}
            {taskPctInProgress > 0 && <div className="bg-blue-500 h-full transition-all" style={{ width: `${taskPctInProgress}%` }} title={`In Progress: ${inProgressTasks}`} />}
            {taskPctTodo > 0 && <div className="bg-hairline h-full transition-all" style={{ width: `${taskPctTodo}%` }} title={`To Do: ${todoTasks}`} />}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-md flex-wrap mt-xs text-[11px] font-[450]">
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-ink/60">Done: <strong>{doneTasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-ink/60">Review: <strong>{reviewTasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-ink/60">In Progress: <strong>{inProgressTasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-hairline" />
              <span className="text-ink/60">To Do: <strong>{todoTasks}</strong></span>
            </div>
          </div>
        </div>

        {/* Subtask Level Progress */}
        <div className="bg-surface-soft/40 border border-hairline-soft rounded-md p-md">
          <div className="flex items-center justify-between mb-xs">
            <span className="font-mono text-[11px] uppercase tracking-[0.6px] text-ink/50">Akumulasi Subtask</span>
            <span className="text-[14px] font-[540] text-ink">
              {doneSubtasks}/{totalSubtasks} Subtask <span className="text-ink/40">({subtaskProgressPct}%)</span>
            </span>
          </div>

          {/* Stacked Bar Chart */}
          <div className="h-[10px] w-full bg-hairline-soft rounded-full overflow-hidden flex my-sm">
            {subPctDone > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${subPctDone}%` }} title={`Done: ${doneSubtasks}`} />}
            {subPctReview > 0 && <div className="bg-amber-500 h-full transition-all" style={{ width: `${subPctReview}%` }} title={`Review: ${reviewSubtasks}`} />}
            {subPctInProgress > 0 && <div className="bg-blue-500 h-full transition-all" style={{ width: `${subPctInProgress}%` }} title={`In Progress: ${inProgressSubtasks}`} />}
            {subPctTodo > 0 && <div className="bg-hairline h-full transition-all" style={{ width: `${subPctTodo}%` }} title={`To Do: ${todoSubtasks}`} />}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-md flex-wrap mt-xs text-[11px] font-[450]">
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-ink/60">Done: <strong>{doneSubtasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-ink/60">Review: <strong>{reviewSubtasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-ink/60">In Progress: <strong>{inProgressSubtasks}</strong></span>
            </div>
            <div className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-hairline" />
              <span className="text-ink/60">To Do: <strong>{todoSubtasks}</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
