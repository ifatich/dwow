import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, subtasks, subtaskAssignees, users, activityLogs, timeContributions, projects } from "@/db/schema";
import { eq, asc, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task.length) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });

    const t = task[0];
    const pid = t.projectId || "";
    const [proj] = await db
      .select({ title: projects.title })
      .from(projects)
      .where(or(eq(projects.id, pid), eq(projects.title, pid)))
      .limit(1);
    const projectTitle = proj?.title || pid;

    const allSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, taskId));
    const allAssignees = await db.select().from(subtaskAssignees);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const subData = await Promise.all(allSubtasks.map(async (s) => {
      const assigneeIds = allAssignees.filter((a) => a.subtaskId === s.id).map((a) => a.staffId).filter(Boolean) as string[];
      const assigneeNames = assigneeIds.map((id) => userMap.get(id)?.username || "");
      
      // Fetch activity logs for this subtask
      const logs = await db.select({
        id: activityLogs.id,
        subtaskId: activityLogs.subtaskId,
        taskId: activityLogs.taskId,
        userId: activityLogs.userId,
        action: activityLogs.action,
        timestamp: activityLogs.timestamp,
        durationHours: activityLogs.durationHours,
        durationCategory: activityLogs.durationCategory,
        durationSeconds: activityLogs.durationSeconds,
        note: activityLogs.note,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .where(eq(activityLogs.subtaskId, s.id))
      .orderBy(asc(activityLogs.timestamp));

      const activityLog = logs.map((l) => {
        const u = allUsers.find((x) => x.id === l.userId);
        return {
          id: l.id,
          subtaskId: l.subtaskId,
          taskId: l.taskId,
          userId: l.userId,
          staffName: u?.username || "",
          staffNama: u?.nama || u?.username || "",
          action: l.action,
          timestamp: l.timestamp,
          durationHours: l.durationHours || 0,
          durationCategory: l.durationCategory || "work",
          durationSeconds: l.durationSeconds || 0,
          note: l.note || "",
        };
      });

      // Fetch time contributions for this subtask
      const times = await db.select({
        staffId: timeContributions.staffId,
        hours: timeContributions.hours,
      })
      .from(timeContributions)
      .where(eq(timeContributions.subtaskId, s.id));

      const assigneeSet = new Set(assigneeNames.map((a) => a.toLowerCase()));

      const timeContribs = times
        .map((t) => {
          const u = allUsers.find((x) => x.id === t.staffId);
          return {
            staffName: u?.username || "unknown",
            staffNama: u?.nama || u?.username || "Unknown",
            hours: t.hours || 0,
          };
        })
        .filter((t) => assigneeSet.has(t.staffName.toLowerCase()));

      // Also calculate time from activity logs as supplement (only for assignees)
      const logTimeMap = new Map<string, number>();
      activityLog.forEach((entry) => {
        if (entry.durationHours > 0 && entry.staffName && assigneeSet.has(entry.staffName.toLowerCase())) {
          logTimeMap.set(entry.staffName, (logTimeMap.get(entry.staffName) || 0) + entry.durationHours);
        }
      });

      // Merge: prefer time_contributions table, supplement with log data
      const mergedTimes = [...timeContribs];
      logTimeMap.forEach((hours, staffName) => {
        if (!mergedTimes.find((t) => t.staffName === staffName)) {
          const u = allUsers.find((x) => x.username === staffName);
          mergedTimes.push({ staffName, staffNama: u?.nama || staffName, hours: Math.round(hours * 10) / 10 });
        }
      });

      return {
        id: s.id, title: s.title, description: s.description,
        done: s.done, status: s.status, assignees: assigneeNames,
        timeContributions: mergedTimes, workloadHours: s.workloadHours, activityLog,
        evidence: s.evidence,
      };
    }));

    const total = subData.length;
    const toDo = subData.filter((s) => s.status === "to_do").length;
    const inProgress = subData.filter((s) => s.status === "in_progress").length;
    const review = subData.filter((s) => s.status === "review").length;
    const done = subData.filter((s) => s.status === "done").length;

    return NextResponse.json({
      id: t.id, ticketId: t.ticketId, title: t.title,
      description: t.description, goals: t.goals, dod: t.dod,
      status: t.status, priority: t.priority, picName: t.picName,
      lead: userMap.get(t.leadId || "")?.username || "",
      project: projectTitle,
      projectId: t.projectId,
      deadline: t.deadline || "",
      subtasks: subData,
      subtaskStats: { total, toDo, inProgress, review, done, progressPercent: total > 0 ? Math.round((done / total) * 100) : 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
