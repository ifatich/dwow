"use client";

import { useState } from "react";

export interface SprintTask {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  priority: string;
  picName: string;
  deadline: string;
  subtasks: { id: string; title: string; status: string; workloadHours: number; assignees?: string[] }[];
}

export interface SprintProject {
  id: string;
  name: string;
  lead: string;
  totalTasks: number;
  doneTasks: number;
  tasks: SprintTask[];
}

export interface SprintGroup {
  sprint: string;
  totalTasks: number;
  doneTasks: number;
  totalHours: number;
  projects: SprintProject[];
  isActive?: boolean;
}

interface SprintListProps {
  sprints: SprintGroup[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-surface-soft text-ink/40",
  "in-progress": "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  to_do: "bg-surface-soft text-ink/40",
  in_progress: "bg-blue-100 text-blue-700",
};
const STATUS_LABEL: Record<string, string> = {
  todo: "To Do", "in-progress": "In Progress", review: "Review", done: "Done",
  to_do: "To Do", in_progress: "In Progress",
};
const PRIORITY_DOT: Record<string, string> = {
  urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢",
};

function statusBadge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-pill px-[8px] py-[1px] text-[10px] font-[540] ${STATUS_COLORS[status] || "bg-surface-soft text-ink/40"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function SprintList({ sprints }: SprintListProps) {
  const [openSprint, setOpenSprint] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);

  return (
    <div className="space-y-md">
      {sprints.map((sprint) => {
        const pct = sprint.totalTasks > 0 ? Math.round((sprint.doneTasks / sprint.totalTasks) * 100) : 0;
        const isOpen = openSprint === sprint.sprint;
        const sprintNum = sprint.sprint.replace(/\D/g, "");

        return (
          <div key={sprint.sprint}>
            {/* Sprint header — collapsible */}
            <button
              type="button"
              onClick={() => setOpenSprint(isOpen ? null : sprint.sprint)}
              className={`w-full text-left bg-surface-soft/40 rounded-lg border p-lg flex items-center gap-lg transition-colors cursor-pointer ${isOpen ? "border-ink/20 bg-surface-soft/70" : "border-hairline-soft hover:border-hairline"
                }`}
            >
              <div className="w-12 h-12 rounded-full bg-canvas border border-hairline flex items-center justify-center flex-shrink-0">
                <span className="text-[14px] font-[700] text-ink/40 tabular-nums">{sprintNum}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-sm">
                  <span className="text-[16px] font-[540] text-ink">{sprint.sprint}</span>
                  {sprint.isActive && (
                    <span className="inline-flex items-center rounded-pill px-[10px] py-[2px] text-[11px] font-[540] bg-green-100 text-green-700">Aktif</span>
                  )}
                </div>
                <p className="text-[12px] font-[320] text-ink/35">{sprint.projects.length} proyek</p>
              </div>
              <div className="flex items-center gap-xl flex-shrink-0">
                <div className="text-center">
                  <div className="text-[20px] font-[540] tabular-nums text-ink">{sprint.doneTasks}/{sprint.totalTasks}</div>
                  <div className="text-[11px] font-[320] text-ink/35">Task</div>
                </div>
                <div className="text-center">
                  <div className="text-[20px] font-[540] tabular-nums text-ink">{sprint.totalHours}j</div>
                  <div className="text-[11px] font-[320] text-ink/35">Jam</div>
                </div>
                <div className="text-center">
                  <div className="text-[20px] font-[540] tabular-nums text-ink">{pct}%</div>
                  <div className="text-[11px] font-[320] text-ink/35">Selesai</div>
                </div>
              </div>
              <div className="w-[80px] flex-shrink-0">
                <div className="w-full h-[4px] bg-surface-soft rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                <path d="M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Projects within sprint */}
            {isOpen && (
              <div className="ml-[72px] mt-sm space-y-sm">
                {sprint.projects.map((proj) => {
                  const projPct = proj.totalTasks > 0 ? Math.round((proj.doneTasks / proj.totalTasks) * 100) : 0;
                  const isProjOpen = openProject === proj.id;

                  return (
                    <div key={proj.id}>
                      <button
                        type="button"
                        onClick={() => setOpenProject(isProjOpen ? null : proj.id)}
                        className={`w-full text-left bg-canvas rounded-lg border p-md flex items-center gap-md transition-colors cursor-pointer ${isProjOpen ? "border-ink/15 shadow-sm" : "border-hairline-soft hover:border-hairline"
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm mb-xxs">
                            <span className="text-[14px] font-[540] text-ink">{proj.name}</span>
                            <span className="text-[11px] font-[320] text-ink/30">Lead: {proj.lead}</span>
                          </div>
                          <div className="flex items-center gap-md text-[11px] text-ink/35">
                            <span>{proj.totalTasks} task</span>
                            <span>{proj.doneTasks} selesai</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-sm flex-shrink-0">
                          <div className="w-[60px]">
                            <div className="w-full h-[3px] bg-surface-soft rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${projPct}%` }} />
                            </div>
                          </div>
                          <span className="text-[12px] font-[540] tabular-nums text-ink/50">{projPct}%</span>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className={`flex-shrink-0 transition-transform ${isProjOpen ? "rotate-180" : ""}`}>
                            <path d="M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>

                      {/* Tasks within project */}
                      {isProjOpen && (
                        <div className="ml-lg mt-sm space-y-xs border-l-2 border-hairline-soft pl-md">
                          {proj.tasks.map((task) => (
                            <div key={task.id} className="bg-surface-soft/30 rounded-md p-sm">
                              <div className="flex items-center gap-sm flex-wrap">
                                <span className="font-mono text-[10px] text-ink/30">{task.ticketId}</span>
                                <span className="text-[13px] font-[480] text-ink/80">{task.title}</span>
                                {PRIORITY_DOT[task.priority] && <span className="text-[11px]">{PRIORITY_DOT[task.priority]}</span>}
                                {statusBadge(task.status)}
                                <span className="text-[11px] text-ink/30 ml-auto">PIC: {task.picName}</span>
                              </div>
                              {/* Subtasks */}
                              {task.subtasks.length > 0 && (
                                <div className="mt-xs space-y-xxs">
                                  {task.subtasks.map((st) => (
                                    <div key={st.id} className="flex items-center gap-md text-[11px] ml-md py-xxs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-ink/15 flex-shrink-0" />
                                      <span className="text-ink/50 flex-1 min-w-0 truncate" title={st.title}>
                                        {st.title}
                                      </span>
                                      <div className="flex items-center gap-md flex-shrink-0">
                                        <div className="w-[140px] flex items-center justify-end gap-xxs flex-shrink-0">
                                          {st.assignees && st.assignees.length > 0 ? (
                                            st.assignees.map((name) => (
                                              <span
                                                key={name}
                                                className="inline-flex items-center rounded-pill px-[7px] py-[1px] text-[10px] font-[500] bg-surface-soft text-ink/60 border border-hairline-soft truncate max-w-[80px]"
                                                title={name}
                                              >
                                                {name}
                                              </span>
                                            ))
                                          ) : (
                                            <span className="text-[11px] text-ink/20 pl-xs">-</span>
                                          )}
                                        </div>
                                        <div className="w-[75px] flex justify-end flex-shrink-0">
                                          {statusBadge(st.status)}
                                        </div>
                                        <span className="w-[32px] text-right text-ink/25 tabular-nums flex-shrink-0">
                                          {st.workloadHours}j
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
