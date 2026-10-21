"use client";

import { Project } from "@/lib/types";
import MetadataSection from "@/features/task/components/metadata-section";
import Link from "next/link";

interface ProjectCardProps {
  project: Project & { reviewSubtasksCount?: number };
  /** Jumlah task user di proyek ini (opsional, untuk staff) */
  userTaskCount?: number;
  /** True jika user adalah lead proyek ini */
  isLeadProject?: boolean;
}

export default function ProjectCard({ project, userTaskCount, isLeadProject }: ProjectCardProps) {
  const hasUserTasks = userTaskCount !== undefined && userTaskCount > 0;
  const tasks = project.totalTasks || 0;
  const progressPercent = tasks > 0 ? Math.round(((project as any).doneTasks / tasks) * 100) : 0;
  const reviewCount = project.reviewSubtasksCount || 0;
  // Penanda review hanya berlaku untuk Lead penanggung jawab proyek/task ini
  const hasReviewPending = Boolean(isLeadProject && reviewCount > 0);

  const isUserProject = hasUserTasks || isLeadProject;

  return (
    <Link
      href={`/project/${project.id}`}
      className="block group h-full"
    >
      <div
        className={`rounded-lg overflow-hidden border flex flex-col h-full transition-all duration-300 ${
          hasReviewPending
            ? "border-amber-400 bg-amber-50/40 hover:border-amber-500 shadow-sm ring-1 ring-amber-300/50"
            : isUserProject
              ? "border-blue-300 hover:border-blue-400 bg-blue-100"
              : "border-hairline hover:border-ink/20 bg-[#f5f5f5]"
        }`}
      >
        {/* Card body: flex-1 flex flex-col justify-between to ensure unified vertical rhythm */}
        <div className="p-xl flex-1 flex flex-col justify-between">
          <div>
            {/* Lead + Sprint + Review Badge */}
            <div className="flex items-center justify-between mb-sm gap-xs flex-wrap min-h-[24px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40">
                Lead: {project.lead}
              </span>
              <div className="flex items-center gap-xs flex-wrap">
                <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-ink/40 bg-canvas/60 rounded-pill px-sm py-xxs">
                  {project.sprint}
                </span>
                {isLeadProject && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-purple-700 bg-purple-100 rounded-pill px-sm py-xxs">Lead</span>
                )}
                {hasReviewPending && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.54px] text-amber-900 bg-amber-200/90 border border-amber-300/80 rounded-pill px-sm py-xxs flex items-center gap-1 font-[550] shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    <span>{reviewCount} Review</span>
                  </span>
                )}
              </div>
            </div>

            {/* Project name — clamped to 2 lines with consistent min-height */}
            <h2 className="text-[22px] font-[540] leading-[1.3] tracking-[-0.22px] text-ink mb-sm line-clamp-2 min-h-[58px]">
              {project.name}
            </h2>

            {/* Description — clamped to 2 lines with consistent min-height */}
            <p className="text-[14px] font-[320] leading-[1.45] text-ink/45 mb-md line-clamp-2 min-h-[42px]">
              {project.description || "—"}
            </p>

            {/* Indicator banner slot — dedicated min-height so progress bar aligns perfectly across all cards */}
            <div className="mb-md min-h-[28px] flex items-center">
              {hasReviewPending ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-[550] text-amber-900 bg-amber-100 border border-amber-300/80 rounded-pill px-sm py-xxs shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
                  <span>{reviewCount} Subtask Menunggu Review Anda</span>
                </span>
              ) : hasUserTasks ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-[540] text-blue-700 bg-blue-100 rounded-pill px-sm py-xxs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>{userTaskCount} tugas Anda di sini</span>
                </span>
              ) : isLeadProject ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-[540] text-purple-700 bg-purple-100 rounded-pill px-sm py-xxs">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <span>Anda Lead proyek ini</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Lower section of body (Progress & Metadata) pinned to bottom */}
          <div className="mt-auto pt-xs">
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-xxs">
                <span className="font-mono text-[11px] uppercase tracking-[0.54px] text-ink/50">
                  Progress
                </span>
                <span className="font-mono text-[11px] text-ink/50 tabular-nums">
                  {(project as any).doneTasks || 0}/{tasks} tasks · {progressPercent}%
                </span>
              </div>
              <div className="w-full h-[6px] bg-canvas/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Metadata — description/goals/dod */}
            <MetadataSection
              description={project.description}
              goals={project.goals}
              dod={project.dod}
              compact
            />
          </div>
        </div>

        {/* Status breakdown pills — fixed at bottom with mt-auto and stable minimum height */}
        <div className="flex items-center gap-xs px-xl pb-lg pt-0 flex-wrap min-h-[38px] mt-auto">
          {(["todo", "in-progress", "review", "done"] as const).map(
            (status) => {
              let count = 0;
              if (status === "todo") count = project.todoTasks || 0;
              else if (status === "in-progress") count = project.inProgressTasks || 0;
              else if (status === "review") count = project.reviewTasks || 0;
              else if (status === "done") count = project.doneTasks || 0;
              
              if (count === 0 && status !== "done") return null;
              const labels: Record<string, string> = {
                todo: "To Do",
                "in-progress": "In Progress",
                review: "Review",
                done: "Done",
              };
              const bgClass =
                status === "done"
                  ? "bg-green-100 text-green-700"
                  : status === "review"
                    ? "bg-amber-100 text-amber-700"
                    : status === "in-progress"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-surface-soft text-ink/50";
              return (
                <span
                  key={status}
                  className={`inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-[450] ${bgClass}`}
                >
                  {labels[status]} {count}
                </span>
              );
            }
          )}
        </div>
      </div>
    </Link>
  );
}
