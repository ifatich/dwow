import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { projects, tasks, subtasks, subtaskAssignees, users } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") || "staff";
    const username = searchParams.get("username") || "";

    // Fetch all data
    const allUsers = await db.select().from(users);
    const allProjects = await db.select().from(projects);
    const allTasks = await db.select().from(tasks);
    const allSubtasks = await db.select().from(subtasks);
    const allAssignees = await db.select().from(subtaskAssignees);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const userObj = allUsers.find((u) => u.username === username || u.id === username);
    const userId = userObj?.id || "";

    // Get subtask IDs where user is assigned (for staff filtering)
    const userSubtaskIds = new Set(
      allAssignees.filter((a) => a.staffId === userId).map((a) => a.subtaskId)
    );

    // Get task IDs from those subtasks or where user is PIC
    const subtaskMap = new Map<string, string>(); // subtaskId → taskId
    for (const s of allSubtasks) subtaskMap.set(s.id, s.taskId);
    const userTaskIds = new Set<string>();
    for (const sid of userSubtaskIds) {
      const tid = subtaskMap.get(sid);
      if (tid) userTaskIds.add(tid);
    }
    for (const t of allTasks) {
      if (t.picName && (t.picName === username || (userObj && t.picName === userObj.nama))) {
        userTaskIds.add(t.id);
      }
    }

    // Determine active sprint (highest sprint number globally)
    const sprintNums = allProjects.map((p) => parseInt(p.sprint.replace(/\D/g, "")) || 0);
    const maxSprint = Math.max(...sprintNums, 0);
    const activeSprintLabel = `Sprint ${maxSprint}`;
    const activeProjectIds = new Set(
      allProjects.filter((p) => p.sprint === activeSprintLabel).map((p) => p.id)
    );

    // Helper derive status from subtasks
    function deriveTaskStatus(tSubtasks: { status: string; done?: boolean }[], rawStatus: string): string {
      const normalizedRaw = rawStatus === "to_do" ? "todo" : rawStatus === "in_progress" ? "in-progress" : rawStatus;
      if (tSubtasks.length === 0) return normalizedRaw;
      const allDone = tSubtasks.every((s) => s.status === "done" || s.done);
      if (allDone) return "done";
      return normalizedRaw;
    }

    // Filter tasks to active sprint only and derive status from subtasks
    const activeSprintTasks = allTasks
      .filter((t) => t.projectId && activeProjectIds.has(t.projectId))
      .map((t) => {
        const tSubtasks = allSubtasks.filter((s) => s.taskId === t.id);
        return {
          ...t,
          status: deriveTaskStatus(tSubtasks, t.status),
        };
      });

    // Filter tasks by role + active sprint
    let filteredTasks = activeSprintTasks;
    if (role === "staff") {
      filteredTasks = activeSprintTasks.filter((t) => userTaskIds.has(t.id));
    } else if (role === "lead") {
      filteredTasks = activeSprintTasks.filter((t) => {
        return t.leadId === userId || userTaskIds.has(t.id);
      });
    }
    // kadep, kadiv, super_admin: all tasks in active sprint

    // Stats (for Stat Cards: Total Tugas, In Progress, Overdue, Selesai)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const totalTasks = filteredTasks.length;
    const doneCount = filteredTasks.filter((t) => t.status === "done").length;
    const inProgressCount = filteredTasks.filter((t) => t.status === "in-progress").length;
    const todoCount = filteredTasks.filter((t) => t.status === "todo").length;
    const reviewCount = filteredTasks.filter((t) => t.status === "review").length;
    const overdueCount = filteredTasks.filter((t) => {
      if (t.status === "done") return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < now;
    }).length;

    // Review tasks (for lead+)
    const reviewTasks = filteredTasks
      .filter((t) => {
        const tSubtasks = allSubtasks.filter((s) => s.taskId === t.id);
        return tSubtasks.some((s) => s.status === "review");
      })
      .map((t) => {
        const project = allProjects.find((p) => p.id === t.projectId);
        const leadUser = t.leadId ? userMap.get(t.leadId) : null;
        const tSubtasks = allSubtasks.filter((s) => s.taskId === t.id);
        const doneSub = tSubtasks.filter((s) => s.status === "done").length;
        return {
          id: t.id,
          ticketId: t.ticketId,
          title: t.title,
          status: t.status,
          priority: t.priority,
          picName: t.picName,
          lead: leadUser?.username || "—",
          project: project?.title || "—",
          projectId: project?.id || "",
          deadline: t.deadline,
          subtaskDone: doneSub,
          subtaskTotal: tSubtasks.length,
        };
      });

    // Task distribution for chart (overall tasks across ALL sprints)
    const allDerivedTasks = allTasks.map((t) => {
      const tSubtasks = allSubtasks.filter((s) => s.taskId === t.id);
      return {
        ...t,
        status: deriveTaskStatus(tSubtasks, t.status),
      };
    });

    let overallRoleTasks = allDerivedTasks;
    if (role === "staff") {
      overallRoleTasks = allDerivedTasks.filter((t) => userTaskIds.has(t.id));
    } else if (role === "lead") {
      overallRoleTasks = allDerivedTasks.filter((t) => t.leadId === userId || userTaskIds.has(t.id));
    }

    const statusDistribution = {
      todo: overallRoleTasks.filter((t) => t.status === "todo").length,
      "in-progress": overallRoleTasks.filter((t) => t.status === "in-progress").length,
      review: overallRoleTasks.filter((t) => t.status === "review").length,
      done: overallRoleTasks.filter((t) => t.status === "done").length,
    };

    // Projects: ALL projects in active sprint, preserving totalTasks and doneTasks for project progress
    const allActiveProjects = allProjects.filter((p) => activeProjectIds.has(p.id));
    const projectData = allActiveProjects.map((p) => {
      const allPtasks = activeSprintTasks.filter((t) => t.projectId === p.id);
      const userPtasks = filteredTasks.filter((t) => t.projectId === p.id);
      const pdone = allPtasks.filter((t) => t.status === "done").length;
      const preview = allPtasks.filter((t) => t.status === "review").length;
      const pinprogress = allPtasks.filter((t) => t.status === "in-progress").length;
      const ptodo = allPtasks.filter((t) => t.status === "todo").length;
      const leadUser = p.leadId ? userMap.get(p.leadId) : null;
      const pSubtasks = allSubtasks.filter((s) => allPtasks.some((t) => t.id === s.taskId));
      const pHours = pSubtasks.reduce((sum, s) => {
        const count = allAssignees.filter((a) => a.subtaskId === s.id).length || 1;
        return sum + (s.workloadHours || 0) * count;
      }, 0);
      return {
        id: p.id,
        name: p.title,
        description: p.description || "",
        goals: p.goals || "",
        dod: p.dod || "",
        sprint: p.sprint,
        lead: leadUser?.username || "—",
        totalTasks: allPtasks.length,
        doneTasks: pdone,
        reviewTasks: preview,
        inProgressTasks: pinprogress,
        todoTasks: ptodo,
        totalHours: pHours,
        userTaskCount: role === "staff" ? userPtasks.length : undefined,
        isLeadProject: role === "lead" && p.leadId === userId,
      };
    });

    // Workload per staff (High level data: All staff & lead users)
    const staffAndLeadUsers = allUsers.filter((u) => u.role === "staff" || u.role === "lead");
    const workloadMap = new Map<string, number>(); // username → total hours
    for (const u of staffAndLeadUsers) {
      workloadMap.set(u.username, 0);
    }

    for (const t of activeSprintTasks) {
      const tSubtasks = allSubtasks.filter((s) => s.taskId === t.id);
      for (const s of tSubtasks) {
        const assignees = allAssignees.filter((a) => a.subtaskId === s.id);
        for (const a of assignees) {
          const u = a.staffId ? userMap.get(a.staffId) : undefined;
          if (u && workloadMap.has(u.username)) {
            workloadMap.set(u.username, workloadMap.get(u.username)! + (s.workloadHours || 0));
          }
        }
      }
    }

    const workload = Array.from(workloadMap.entries())
      .map(([uname, hours]) => {
        const u = allUsers.find((x) => x.username === uname);
        const sprintCap = u?.capacityHoursPerMonth || 72; // Kapasitas jam langsung per 2-week sprint
        return { username: uname, name: u?.nama || uname, role: u?.role || "staff", hours, capacity: sprintCap };
      })
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));

    // Sprint velocity — all sprints for chart, mark active
    const sprintVelocity = new Map<string, { done: number; total: number }>();
    for (const t of allTasks) {
      const proj = allProjects.find((p) => p.id === t.projectId);
      if (!proj) continue;
      const v = sprintVelocity.get(proj.sprint) || { done: 0, total: 0 };
      v.total++;
      if (t.status === "done") v.done++;
      sprintVelocity.set(proj.sprint, v);
    }
    const velocityData = Array.from(sprintVelocity.entries())
      .map(([sprint, v]) => ({ sprint: sprint.replace("Sprint ", "S"), done: v.done, total: v.total, isActive: sprint === activeSprintLabel }))
      .sort((a, b) => parseInt(a.sprint.replace(/\D/g, "")) - parseInt(b.sprint.replace(/\D/g, "")));

    // Unassigned subtasks in active sprint
    const assignedSubtaskIds = new Set(allAssignees.map((a) => a.subtaskId));
    const activeSubtasks = allSubtasks.filter((s) => {
      const t = allTasks.find((task) => task.id === s.taskId);
      return t && t.projectId && activeProjectIds.has(t.projectId);
    });
    const unassignedSubtasksCount = activeSubtasks.filter((s) => !assignedSubtaskIds.has(s.id)).length;

    // Ambil data penugasan staf per lead dari tabel lead_staff_assignments
    const teamAssignments = sqlite.prepare(`
      SELECT lsa.lead_id, lsa.staff_id, u.nama, u.username, u.capacity_hours_per_month
      FROM lead_staff_assignments lsa
      JOIN users u ON lsa.staff_id = u.id
    `).all() as Array<{
      lead_id: string;
      staff_id: string;
      nama: string;
      username: string;
      capacity_hours_per_month: number;
    }>;

    const assignedStaffByLead = new Map<string, Array<{
      id: string;
      name: string;
      username: string;
      capacity: number;
    }>>();

    for (const a of teamAssignments) {
      if (!assignedStaffByLead.has(a.lead_id)) {
        assignedStaffByLead.set(a.lead_id, []);
      }
      const staffCap = a.capacity_hours_per_month || 72;
      assignedStaffByLead.get(a.lead_id)!.push({
        id: a.staff_id,
        name: a.nama,
        username: a.username,
        capacity: staffCap,
      });
    }

    // Lead performance stats with explicit distinction between own execution vs review duties
    const leadUsers = allUsers.filter((u) => u.role === "lead");
    const leadsPerformance = leadUsers
      .map((lead) => {
        const ledProjects = allProjects.filter((p) => p.leadId === lead.id);
        const ledProjectIds = new Set(ledProjects.map((p) => p.id));
        const ledTasks = activeSprintTasks.filter((t) => t.projectId && ledProjectIds.has(t.projectId));
        const totalTasks = ledTasks.length;
        const doneTasks = ledTasks.filter((t) => t.status === "done").length;
        const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

        const ledSubtasks = allSubtasks.filter((s) => ledTasks.some((t) => t.id === s.taskId));
        const reviewPendingCount = ledSubtasks.filter((s) => s.status === "review").length;

        // Ambil penugasan staf definitif dari Struktur Tim (lead_staff_assignments)
        const myStaffList = assignedStaffByLead.get(lead.id) || [];
        const hasCustomAssignments = teamAssignments.length > 0;

        let teamSize = myStaffList.length;
        let teamMembers: Array<{ username: string; name: string; hours: number; capacity: number }> = [];

        if (hasCustomAssignments) {
          // Gunakan penugasan staf yang definitif dari Master Data Struktur Tim
          teamMembers = myStaffList
            .map((staff) => ({
              username: staff.username,
              name: staff.name,
              hours: workloadMap.get(staff.username) || 0,
              capacity: staff.capacity,
            }))
            .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
        } else {
          // Fallback jika belum ada penugasan di master data (HANYA role staff, jangan sertakan sesama lead)
          const fallbackMemberMap = new Map<string, { username: string; name: string; hours: number; capacity: number }>();
          for (const s of ledSubtasks) {
            const assignees = allAssignees.filter((a) => a.subtaskId === s.id);
            for (const a of assignees) {
              const u = a.staffId ? userMap.get(a.staffId) : undefined;
              if (u && u.role === "staff") {
                const current = fallbackMemberMap.get(u.username) || {
                  username: u.username,
                  name: u.nama,
                  hours: 0,
                  capacity: u.capacityHoursPerMonth || 72,
                };
                current.hours += s.workloadHours || 0;
                fallbackMemberMap.set(u.username, current);
              }
            }
          }
          teamMembers = Array.from(fallbackMemberMap.values()).sort((a, b) => b.hours - a.hours);
          teamSize = teamMembers.length;
        }

        // Own execution subtasks (Subtasks assigned directly to lead as executor)
        const ownAssignees = allAssignees.filter((a) => a.staffId === lead.id);
        const ownSubtaskIds = new Set(ownAssignees.map((a) => a.subtaskId));
        const ownSubtasks = activeSubtasks.filter((s) => ownSubtaskIds.has(s.id));
        const ownSubtasksTotal = ownSubtasks.length;
        const ownSubtasksDone = ownSubtasks.filter((s) => s.status === "done").length;
        const ownWorkloadHours = Math.round(ownSubtasks.reduce((sum, s) => sum + s.workloadHours, 0));

        return {
          username: lead.username,
          name: lead.nama,
          projectsCount: ledProjects.length,
          totalTasks,
          doneTasks,
          completionRate,
          reviewPendingCount,
          teamSize,
          ownSubtasksTotal,
          ownSubtasksDone,
          ownWorkloadHours,
          teamMembers,
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate || b.totalTasks - a.totalTasks);

    return NextResponse.json({
      activeSprint: activeSprintLabel,
      stats: { totalTasks, inProgressCount, overdueCount, doneCount, todoCount, reviewCount, unassignedSubtasksCount },
      projects: projectData,
      tasks: filteredTasks.map((t) => ({
        id: t.id,
        ticketId: t.ticketId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        project: allProjects.find((p) => p.id === t.projectId)?.title || "",
      })),
      reviewTasks,
      statusDistribution,
      workload,
      velocity: velocityData,
      leadsPerformance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
