import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, subtasks, users, subtaskAssignees } from "@/db/schema";
import { eq } from "drizzle-orm";

type TaskRow = {
  id: string;
  ticketId: string;
  title: string;
  status: string;
  priority: string;
  picName: string;
  deadline: string | null;
  projectId: string | null;
};

type SubtaskRow = {
  id: string;
  taskId: string;
  title: string;
  status: string;
  done: boolean;
  workloadHours: number;
};

type ProjectRow = {
  id: string;
  title: string;
  sprint: string;
  leadId: string | null;
};

interface SprintGroup {
  sprint: string;
  totalTasks: number;
  doneTasks: number;
  totalHours: number;
  projects: {
    id: string;
    name: string;
    lead: string;
    totalTasks: number;
    doneTasks: number;
    tasks: {
      id: string;
      ticketId: string;
      title: string;
      status: string;
      priority: string;
      picName: string;
      deadline: string;
      subtasks: { id: string; title: string; status: string; workloadHours: number; assignees: string[] }[];
    }[];
  }[];
  isActive?: boolean;
}

// Micro-cache 5 detik untuk menghindari query ganda dari multiple component render
let cachedSprints: { data: SprintGroup[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5000;

/**
 * GET /api/sprints — sprints grouped by sprint name with projects, tasks & subtasks
 */
export async function GET(_request: NextRequest) {
  try {
    const now = Date.now();
    if (cachedSprints && cachedSprints.expiresAt > now) {
      return NextResponse.json(cachedSprints.data, {
        headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=15" },
      });
    }

    // Ambil data projects, tasks, subtasks, users, dan assignees secara paralel (hanya kolom yang dibutuhkan)
    const [allProjects, allTasks, allSubtasks, allUsers, allAssignees] = await Promise.all([
      db
        .select({
          id: projects.id,
          title: projects.title,
          sprint: projects.sprint,
          leadId: projects.leadId,
        })
        .from(projects)
        .orderBy(projects.sprint as any),
      db
        .select({
          id: tasks.id,
          ticketId: tasks.ticketId,
          title: tasks.title,
          status: tasks.status,
          priority: tasks.priority,
          picName: tasks.picName,
          deadline: tasks.deadline,
          projectId: tasks.projectId,
        })
        .from(tasks),
      db
        .select({
          id: subtasks.id,
          taskId: subtasks.taskId,
          title: subtasks.title,
          status: subtasks.status,
          done: subtasks.done,
          workloadHours: subtasks.workloadHours,
        })
        .from(subtasks),
      db
        .select({
          id: users.id,
          username: users.username,
        })
        .from(users),
      db
        .select({
          subtaskId: subtaskAssignees.subtaskId,
          username: users.username,
        })
        .from(subtaskAssignees)
        .innerJoin(users, eq(subtaskAssignees.staffId, users.id)),
    ]);

    const assigneesBySubtask = new Map<string, string[]>();
    for (const a of allAssignees) {
      const list = assigneesBySubtask.get(a.subtaskId) || [];
      list.push(a.username);
      assigneesBySubtask.set(a.subtaskId, list);
    }

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const tasksByProject = new Map<string, TaskRow[]>();
    const subtasksByTask = new Map<string, SubtaskRow[]>();

    for (const t of allTasks) {
      const pid = t.projectId ?? "";
      const arr = tasksByProject.get(pid) || [];
      arr.push(t);
      tasksByProject.set(pid, arr);
    }
    for (const s of allSubtasks) {
      const arr = subtasksByTask.get(s.taskId) || [];
      arr.push(s);
      subtasksByTask.set(s.taskId, arr);
    }

    // Group by sprint name
    const sprintMap = new Map<string, ProjectRow[]>();
    for (const p of allProjects) {
      const arr = sprintMap.get(p.sprint) || [];
      arr.push(p);
      sprintMap.set(p.sprint, arr);
    }

    function deriveTaskStatus(stasks: { status: string; done?: boolean }[], rawStatus: string): string {
      if (stasks.length === 0) return rawStatus;
      const allDone = stasks.every((s) => s.status === "done" || s.done);
      if (allDone) return "done";
      const anyStarted = stasks.some((s) => s.status !== "to_do");
      return anyStarted ? "in-progress" : "todo";
    }

    // Build response
    const result: SprintGroup[] = [];
    for (const [sprintName, sprintProjects] of sprintMap) {
      let totalTasks = 0, doneTasks = 0, totalHours = 0;
      const projData: SprintGroup["projects"] = [];

      for (const p of sprintProjects) {
        const rawPtasks = tasksByProject.get(p.id) || [];
        const ptasks = rawPtasks.map((t) => {
          const stasks = subtasksByTask.get(t.id) || [];
          return {
            ...t,
            derivedStatus: deriveTaskStatus(stasks, t.status),
          };
        });

        const pDone = ptasks.filter((t) => t.derivedStatus === "done").length;
        totalTasks += ptasks.length;
        doneTasks += pDone;

        const taskData = ptasks.map((t) => {
          const stasks = subtasksByTask.get(t.id) || [];
          const stHours = stasks.reduce((s, st) => s + st.workloadHours, 0);
          totalHours += stHours;
          return {
            id: t.id,
            ticketId: t.ticketId,
            title: t.title,
            status: t.derivedStatus,
            priority: t.priority,
            picName: t.picName,
            deadline: t.deadline ?? "",
            subtasks: stasks.map((st) => ({
              id: st.id,
              title: st.title,
              status: st.status,
              workloadHours: st.workloadHours,
              assignees: assigneesBySubtask.get(st.id) || [],
            })),
          };
        });

        const leadUser = p.leadId ? userMap.get(p.leadId) : null;
        projData.push({
          id: p.id,
          name: p.title,
          lead: leadUser?.username || "—",
          totalTasks: ptasks.length,
          doneTasks: pDone,
          tasks: taskData,
        });
      }

      result.push({ sprint: sprintName, totalTasks, doneTasks, totalHours, projects: projData });
    }

    // Sort sprints descending (Sprint 10 first) & mark active
    const sprintNums = result.map((r) => parseInt(r.sprint.replace(/\D/g, "")) || 0);
    const maxSprint = Math.max(...sprintNums, 0);
    const activeLabel = `Sprint ${maxSprint}`;

    result.sort((a, b) => {
      const na = parseInt(a.sprint.replace(/\D/g, "")) || 0;
      const nb = parseInt(b.sprint.replace(/\D/g, "")) || 0;
      return nb - na;
    });

    const finalResult = result.map((r) => ({ ...r, isActive: r.sprint === activeLabel }));
    cachedSprints = { data: finalResult, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(finalResult, {
      headers: { "Cache-Control": "public, max-age=5, stale-while-revalidate=15" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
