import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, subtasks, subtaskAssignees, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { calculateStaffPerformance, calculateLeadPerformance } from "@/lib/performance-calculator";
import { aggregateStaffMetrics, RawUserAssignment } from "@/features/reports/utils/aggregate-metrics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "bulanan";
  const userFilter = searchParams.get("username") || "all";
  const userFilterList = userFilter === "all" ? [] : userFilter.split(",").filter(Boolean);
  const isUserSelected = (uName: string) => {
    if (userFilter === "all" || userFilterList.length === 0) return true;
    return userFilterList.includes(uName);
  };
  const sprintFilter = searchParams.get("sprint") || "all";
  const periodMultiplier = period === "tahunan" ? 12 : period === "kuartalan" ? 3 : 1;

  try {
    // 1. Get all users
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    // 2. Determine total unique sprints for capacity normalization
    const allProjects = await db.select().from(projects);
    const uniqueSprints = Array.from(new Set(allProjects.map((p) => p.sprint).filter(Boolean)));
    const totalSprintsCount = Math.max(1, uniqueSprints.length);

    // Per-sprint base capacity (80h per sprint base minus leave days * 8)
    const getSprintCapacity = (user: typeof allUsers[0]) => {
      const basePerSprint = Math.round((user.capacityHoursPerMonth || 160) / 2); // 80h per sprint
      const leaveHours = (user.leaveDays || 0) * 8;
      return Math.max(10, basePerSprint - leaveHours);
    };

    // 3. Fetch all subtask assignments
    const assignments = await db
      .select({
        userId: subtaskAssignees.staffId,
        workload: subtasks.workloadHours,
        subtaskStatus: subtasks.status,
        projectSprint: projects.sprint,
      })
      .from(subtaskAssignees)
      .innerJoin(subtasks, eq(subtasks.id, subtaskAssignees.subtaskId))
      .leftJoin(tasks, eq(subtasks.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id));

    // Per-staff aggregation
    const staffMap: Record<
      string,
      {
        name: string;
        username: string;
        workload: number;
        doneSubtasks: number;
        totalSubtasks: number;
        sprintCapacity: number;
        leaveDays: number;
      }
    > = {};

    for (const a of assignments) {
      if (sprintFilter !== "all" && a.projectSprint !== sprintFilter) continue;

      const user = userMap.get(a.userId!);
      if (!user || user.role === "super_admin" || user.role === "kadep" || user.role === "kadiv") continue;

      const key = user.username;
      if (!isUserSelected(key)) continue;

      if (!staffMap[key]) {
        staffMap[key] = {
          name: user.nama,
          username: user.username,
          workload: 0,
          doneSubtasks: 0,
          totalSubtasks: 0,
          sprintCapacity: getSprintCapacity(user),
          leaveDays: user.leaveDays || 0,
        };
      }
      staffMap[key].workload += a.workload;
      staffMap[key].totalSubtasks += 1;
      if (a.subtaskStatus === "done") staffMap[key].doneSubtasks += 1;
    }

    // Also add staff & lead users with no assignments if matching userFilter
    for (const u of allUsers) {
      if (u.role === "super_admin" || u.role === "kadep" || u.role === "kadiv") continue;
      if (!isUserSelected(u.username)) continue;
      if (!staffMap[u.username]) {
        staffMap[u.username] = {
          name: u.nama,
          username: u.username,
          workload: 0,
          doneSubtasks: 0,
          totalSubtasks: 0,
          sprintCapacity: getSprintCapacity(u),
          leaveDays: u.leaveDays || 0,
        };
      }
    }

    // Calculate Lead Review duties (reviewsTotal, reviewsDone, reviewsPending)
    const allSubtasksList = await db
      .select({
        id: subtasks.id,
        status: subtasks.status,
        projectId: tasks.projectId,
        projectSprint: projects.sprint,
      })
      .from(subtasks)
      .leftJoin(tasks, eq(subtasks.taskId, tasks.id))
      .leftJoin(projects, eq(tasks.projectId, projects.id));

    const leadReviewMap: Record<string, { total: number; done: number; pending: number }> = {};
    for (const u of allUsers) {
      if (u.role === "lead") {
        const ledProjects = allProjects.filter((p) => p.leadId === u.id);
        const ledProjectIds = new Set(ledProjects.map((p) => p.id));

        const ledSubtasks = allSubtasksList.filter((s) => {
          if (sprintFilter !== "all" && s.projectSprint !== sprintFilter) return false;
          return s.projectId && ledProjectIds.has(s.projectId);
        });

        const total = ledSubtasks.length;
        const pending = ledSubtasks.filter((s) => s.status === "review").length;
        const done = ledSubtasks.filter((s) => s.status === "done").length;

        leadReviewMap[u.username] = { total, done, pending };
      }
    }

    // Build raw staff metrics map
    const rawUsers: RawUserAssignment[] = Object.entries(staffMap).map(([username, d]) => {
      const u = allUsers.find((x) => x.username === username);
      const isLead = u?.role === "lead";
      const reviewStats = isLead ? (leadReviewMap[username] || { total: 0, done: 0, pending: 0 }) : undefined;

      return {
        username,
        name: d.name,
        role: u?.role || "staff",
        department: u?.department || "Engineering",
        capacityHoursPerMonth: u?.capacityHoursPerMonth || 160,
        leaveDays: u?.leaveDays || 0,
        workload: d.workload,
        subtasksDone: d.doneSubtasks,
        subtasksTotal: d.totalSubtasks,
        reviewsDone: reviewStats?.done || 0,
        reviewsTotal: reviewStats?.total || 0,
        reviewsPending: reviewStats?.pending || 0,
      };
    });

    const activeSprintsCount = sprintFilter === "all" ? totalSprintsCount : 1;
    const aggregatedStaff = aggregateStaffMetrics(rawUsers, activeSprintsCount, periodMultiplier);

    // Rank top performers (Top 3 highest score in active team)
    const sortedByScore = [...aggregatedStaff].sort((a, b) => b.performanceScore - a.performanceScore || b.subtasksDone - a.subtasksDone);
    const topCount = Math.min(3, sortedByScore.length);
    const topThreeUsernames = new Set(sortedByScore.slice(0, topCount).map((s) => s.username));

    const staff = aggregatedStaff.map((s) => {
      let performanceCategory = "Optimal";
      if (topThreeUsernames.has(s.username)) {
        performanceCategory = "Top Performer";
      } else if (s.utilization > 110) {
        performanceCategory = "Overload";
      } else if (s.utilization < 75 || s.performanceScore < 60) {
        performanceCategory = "Underutilized";
      } else {
        performanceCategory = "Optimal";
      }

      return {
        ...s,
        performanceCategory,
      };
    });

    // Filter summary tasks by sprint & user
    let filteredTasks = await db
      .select({
        taskId: tasks.id,
        status: tasks.status,
        projectSprint: projects.sprint,
        leadId: tasks.leadId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id));

    if (sprintFilter !== "all") {
      filteredTasks = filteredTasks.filter((t) => t.projectSprint === sprintFilter);
    }
    if (userFilter !== "all" && userFilterList.length > 0) {
      const selectedUserIds = new Set(
        allUsers.filter((u) => userFilterList.includes(u.username)).map((u) => u.id)
      );
      filteredTasks = filteredTasks.filter((t) => t.leadId && selectedUserIds.has(t.leadId));
    }

    const doneTasksCount = filteredTasks.filter((t) => t.status === "done").length;
    const totalWorkload = staff.reduce((s, st) => s + st.workload, 0);
    const totalCapacity = staff.reduce((s, st) => s + st.capacity, 0);

    const avgPerformanceScore =
      staff.length > 0
        ? Math.round(staff.reduce((s, st) => s + st.performanceScore, 0) / staff.length)
        : 0;

    // Executive Projects high-level categorization
    const allTasksList = await db.select().from(tasks);
    const allSubtasksListForProj = await db.select().from(subtasks);
    const allSubtaskAssignees = await db.select({ subtaskId: subtaskAssignees.subtaskId }).from(subtaskAssignees);

    const executiveProjectsList = allProjects.map((p) => {
      const projTasks = allTasksList.filter((t) => t.projectId === p.id);
      const totalTasksCount = projTasks.length;
      const doneTasksCount = projTasks.filter((t) => t.status === "done").length;
      const inProgressTasksCount = projTasks.filter((t) => t.status === "in-progress" || t.status === "review").length;
      const todoTasksCount = projTasks.filter((t) => t.status === "todo").length;
      
      const leadUser = userMap.get(p.leadId || "");
      const leadName = leadUser?.username || "unassigned";

      const projTaskIds = new Set(projTasks.map((t) => t.id));
      const projSubtasks = allSubtasksListForProj.filter((st) => projTaskIds.has(st.taskId));
      const workloadHours = projSubtasks.reduce((sum, st) => {
        const count = allSubtaskAssignees.filter((a) => a.subtaskId === st.id).length || 1;
        return sum + (st.workloadHours || 0) * count;
      }, 0);

      const progressPct = totalTasksCount > 0 ? Math.round((doneTasksCount / totalTasksCount) * 100) : 0;

      let statusCategory: "in_progress" | "completed" | "planned" = "planned";
      if (totalTasksCount > 0 && doneTasksCount === totalTasksCount) {
        statusCategory = "completed";
      } else if (progressPct > 0 || inProgressTasksCount > 0) {
        statusCategory = "in_progress";
      } else {
        statusCategory = "planned";
      }

      return {
        id: p.id,
        name: p.title,
        description: p.description || "",
        lead: leadName,
        sprint: p.sprint || "Sprint General",
        statusCategory,
        totalTasks: totalTasksCount,
        doneTasks: doneTasksCount,
        inProgressTasks: inProgressTasksCount,
        todoTasks: todoTasksCount,
        progressPct,
        workloadHours,
      };
    });

    const inProgressProjects = executiveProjectsList.filter((p) => p.statusCategory === "in_progress");
    const completedProjects = executiveProjectsList.filter((p) => p.statusCategory === "completed");
    const plannedProjects = executiveProjectsList.filter((p) => p.statusCategory === "planned");

    const totalProjCount = executiveProjectsList.length;
    const totalWorkloadHours = executiveProjectsList.reduce((sum, p) => sum + p.workloadHours, 0);
    const overallProgressPct = totalProjCount > 0 
      ? Math.round(executiveProjectsList.reduce((sum, p) => sum + p.progressPct, 0) / totalProjCount) 
      : 0;

    const executiveProjects = {
      summary: {
        totalProjects: totalProjCount,
        inProgressCount: inProgressProjects.length,
        completedCount: completedProjects.length,
        plannedCount: plannedProjects.length,
        overallProgressPct,
        totalWorkloadHours,
      },
      inProgressProjects,
      completedProjects,
      plannedProjects,
    };

    return NextResponse.json({
      period,
      sprintFilter,
      userFilter,
      totalSprintsCount,
      summary: {
        totalTasks: filteredTasks.length,
        doneTasks: doneTasksCount,
        completionRate: filteredTasks.length > 0 ? Math.round((doneTasksCount / filteredTasks.length) * 100) : 0,
        totalWorkload: Math.round(totalWorkload),
        totalCapacity: Math.round(totalCapacity),
        avgPerformanceScore,
        topPerformersCount: staff.filter((st) => st.performanceCategory === "Top Performer").length,
        optimalCount: staff.filter((st) => st.performanceCategory === "Optimal").length,
        overloadCount: staff.filter((st) => st.performanceCategory === "Overload").length,
        underutilizedCount: staff.filter((st) => st.performanceCategory === "Underutilized").length,
      },
      staff,
      executiveProjects,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
