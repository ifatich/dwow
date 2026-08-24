import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, subtasks, users, subtaskAssignees } from "@/db/schema";
import { eq } from "drizzle-orm";

type TaskRow = typeof tasks.$inferSelect;
type SubtaskRow = typeof subtasks.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

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
}

/**
 * GET /api/sprints — sprints grouped by sprint name with projects, tasks & subtasks
 */
export async function GET(_request: NextRequest) {
  try {
    const allProjects = await db.select().from(projects).orderBy(projects.sprint as any);

    // Get all tasks & subtasks for all projects
    const allTasks = await db.select().from(tasks);
    const allSubtasks = await db.select().from(subtasks);
    const allUsers = await db.select().from(users);

    // Get subtask assignees
    const allAssignees = await db
      .select({
        subtaskId: subtaskAssignees.subtaskId,
        username: users.username,
      })
      .from(subtaskAssignees)
      .innerJoin(users, eq(subtaskAssignees.staffId, users.id));

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

    return NextResponse.json(result.map((r) => ({ ...r, isActive: r.sprint === activeLabel })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
