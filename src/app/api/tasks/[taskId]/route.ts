import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, subtasks, subtaskAssignees, users, activityLogs, timeContributions, projects } from "@/db/schema";
import { eq, asc, or, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    // Batch 1: Ambil task dan subtasks secara paralel (1 roundtrip)
    const [taskRows, allSubtasks] = await Promise.all([
      db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1),
      db.select().from(subtasks).where(eq(subtasks.taskId, taskId)),
    ]);

    if (!taskRows.length) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });

    const t = taskRows[0];
    const pid = t.projectId || "";
    const subIds = allSubtasks.map((s) => s.id);

    // Batch 2: Ambil data terkait (project, assignees, logs, times, users) secara paralel (1 roundtrip)
    const [projRows, allAssignees, allLogs, allTimes, allUsers] = await Promise.all([
      pid
        ? db
            .select({ title: projects.title })
            .from(projects)
            .where(or(eq(projects.id, pid), eq(projects.title, pid)))
            .limit(1)
        : Promise.resolve([]),
      subIds.length > 0
        ? db.select().from(subtaskAssignees).where(inArray(subtaskAssignees.subtaskId, subIds))
        : Promise.resolve([]),
      subIds.length > 0
        ? db
            .select({
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
            .where(inArray(activityLogs.subtaskId, subIds))
            .orderBy(asc(activityLogs.timestamp))
        : Promise.resolve([]),
      subIds.length > 0
        ? db
            .select({
              subtaskId: timeContributions.subtaskId,
              staffId: timeContributions.staffId,
              hours: timeContributions.hours,
            })
            .from(timeContributions)
            .where(inArray(timeContributions.subtaskId, subIds))
        : Promise.resolve([]),
      db.select().from(users),
    ]);

    const projectTitle = projRows[0]?.title || pid;
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // Indeks assignees per subtaskId
    const assigneesBySub = new Map<string, string[]>();
    for (const a of allAssignees) {
      if (!a.subtaskId) continue;
      const list = assigneesBySub.get(a.subtaskId) || [];
      const u = a.staffId ? userMap.get(a.staffId) : null;
      if (u?.username) list.push(u.username);
      assigneesBySub.set(a.subtaskId, list);
    }

    // Indeks logs per subtaskId
    const logsBySub = new Map<string, any[]>();
    for (const l of allLogs) {
      if (!l.subtaskId) continue;
      const list = logsBySub.get(l.subtaskId) || [];
      const u = l.userId ? userMap.get(l.userId) : null;
      list.push({
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
      });
      logsBySub.set(l.subtaskId, list);
    }

    // Indeks times per subtaskId
    const timesBySub = new Map<string, any[]>();
    for (const tRow of allTimes) {
      if (!tRow.subtaskId) continue;
      const list = timesBySub.get(tRow.subtaskId) || [];
      const u = tRow.staffId ? userMap.get(tRow.staffId) : null;
      list.push({
        staffName: u?.username || "unknown",
        staffNama: u?.nama || u?.username || "Unknown",
        hours: tRow.hours || 0,
      });
      timesBySub.set(tRow.subtaskId, list);
    }

    // Map subData dalam memori (0ms)
    const subData = allSubtasks.map((s) => {
      const assigneeNames = assigneesBySub.get(s.id) || [];
      const activityLog = logsBySub.get(s.id) || [];
      const rawTimes = timesBySub.get(s.id) || [];

      const assigneeSet = new Set(assigneeNames.map((a) => a.toLowerCase()));
      const timeContribs = rawTimes.filter((t) => assigneeSet.has(t.staffName.toLowerCase()));

      // Calculate time from activity logs as supplement (only for assignees)
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
        id: s.id,
        title: s.title,
        description: s.description,
        done: s.done,
        status: s.status,
        assignees: assigneeNames,
        timeContributions: mergedTimes,
        workloadHours: s.workloadHours,
        activityLog,
        evidence: s.evidence,
      };
    });

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
