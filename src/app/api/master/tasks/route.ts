import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { db } from "@/db";
import { tasks, projects, users, subtasks, activityLogs } from "@/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/master/tasks
 * Mengambil seluruh daftar task untuk pengelolaan Master Data,
 * beserta informasi Lead, Project, Sprint, PIC, dan daftar available leads.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role as string;
    if (!["lead", "kadep", "kadiv", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Hanya reviewer yang dapat mengakses master data" }, { status: 403 });
    }

    // Ambil semua tasks dan relasi project & lead
    const taskRows = await db
      .select({
        id: tasks.id,
        ticketId: tasks.ticketId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        picName: tasks.picName,
        leadId: tasks.leadId,
        projectId: tasks.projectId,
        deadline: tasks.deadline,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectTitle: projects.title,
        projectSprint: projects.sprint,
        projectLeadId: projects.leadId,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .orderBy(desc(tasks.createdAt));

    // Ambil subtasks agregat untuk setiap task
    const allSubtasks = await db
      .select({
        id: subtasks.id,
        taskId: subtasks.taskId,
        status: subtasks.status,
        workloadHours: subtasks.workloadHours,
      })
      .from(subtasks);

    const subtaskStatsByTask = new Map<string, { total: number; done: number; review: number; inProgress: number; hours: number }>();
    for (const s of allSubtasks) {
      const current = subtaskStatsByTask.get(s.taskId) || { total: 0, done: 0, review: 0, inProgress: 0, hours: 0 };
      current.total += 1;
      if (s.status === "done") current.done += 1;
      else if (s.status === "review") current.review += 1;
      else if (s.status === "in_progress") current.inProgress += 1;
      current.hours += s.workloadHours || 0;
      subtaskStatsByTask.set(s.taskId, current);
    }

    // Ambil seluruh users
    const allUsers = await db
      .select({
        id: users.id,
        nama: users.nama,
        username: users.username,
        role: users.role,
        department: users.department,
        avatar: users.avatar,
      })
      .from(users);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const userByNameOrUsername = new Map<string, typeof allUsers[0]>();
    for (const u of allUsers) {
      if (u.nama) userByNameOrUsername.set(u.nama.toLowerCase().trim(), u);
      if (u.username) userByNameOrUsername.set(u.username.toLowerCase().trim(), u);
    }

    // Available leads: hanya user dengan role = 'lead'
    const availableLeads = allUsers
      .filter((u) => u.role === "lead")
      .sort((a, b) => a.nama.localeCompare(b.nama));

    // Petakan data task lengkap
    const mappedTasks = taskRows.map((t) => {
      const leadUser = t.leadId ? userMap.get(t.leadId) : null;
      const projectLeadUser = t.projectLeadId ? userMap.get(t.projectLeadId) : null;
      const picUser = t.picName ? userByNameOrUsername.get(t.picName.toLowerCase().trim()) : null;
      const stats = subtaskStatsByTask.get(t.id) || { total: 0, done: 0, review: 0, inProgress: 0, hours: 0 };

      return {
        id: t.id,
        ticketId: t.ticketId,
        title: t.title,
        description: t.description || "",
        status: t.status,
        priority: t.priority,
        picName: t.picName,
        picAvatar: picUser?.avatar || null,
        picUserId: picUser?.id || null,
        deadline: t.deadline || "",
        projectId: t.projectId || "",
        projectTitle: t.projectTitle || "Tanpa Proyek",
        sprint: t.projectSprint || "Tanpa Sprint",
        leadId: t.leadId,
        leadName: leadUser?.nama || null,
        leadUsername: leadUser?.username || null,
        leadRole: leadUser?.role || null,
        leadAvatar: leadUser?.avatar || null,
        projectLeadName: projectLeadUser?.nama || null,
        subtaskTotal: stats.total,
        subtaskDone: stats.done,
        subtaskReview: stats.review,
        subtaskInProgress: stats.inProgress,
        totalHours: Math.round(stats.hours * 10) / 10,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    // Kumpulan filter distinct
    const sprints = Array.from(new Set(mappedTasks.map((t) => t.sprint).filter(Boolean))).sort();
    const projectList = Array.from(new Set(mappedTasks.map((t) => t.projectTitle).filter(Boolean))).sort();

    return NextResponse.json({
      tasks: mappedTasks,
      availableLeads,
      sprints,
      projects: projectList,
    });
  } catch (err: any) {
    console.error("GET /api/master/tasks error:", err);
    return NextResponse.json({ error: err.message || "Gagal mengambil data task" }, { status: 500 });
  }
}

/**
 * PATCH /api/master/tasks
 * Memperbarui Lead penanggung jawab pada level task.
 * Body: { taskId: string, leadId: string | null }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role as string;
    const currentUsername = (session.user as any).username as string;
    const currentUserId = (session.user as any).id as string;

    if (!["lead", "kadep", "kadiv", "super_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden: Hanya reviewer yang dapat mengatur lead task" }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, leadId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "taskId wajib disertakan" }, { status: 400 });
    }

    // Cari task
    const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!existingTask) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }

    // Validasi leadId jika diberikan
    let targetLeadName = "Tidak Ditugaskan";
    if (leadId) {
      const [leadUser] = await db.select().from(users).where(eq(users.id, leadId)).limit(1);
      if (!leadUser) {
        return NextResponse.json({ error: "Pengguna Lead tidak ditemukan" }, { status: 404 });
      }
      if (leadUser.role !== "lead") {
        return NextResponse.json({ error: "Pengguna yang dipilih harus memiliki peran Lead" }, { status: 400 });
      }
      targetLeadName = leadUser.nama;
    }

    const now = new Date().toISOString();

    // Update leadId pada task
    await db
      .update(tasks)
      .set({
        leadId: leadId || null,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId))
      .run();

    // Catat activity log
    try {
      await db.insert(activityLogs).values({
        id: crypto.randomUUID(),
        taskId,
        userId: currentUserId,
        action: "task_lead_assigned",
        note: `Lead task diatur menjadi "${targetLeadName}" oleh ${currentUsername}`,
        timestamp: now,
      });
    } catch (logErr) {
      console.warn("Gagal mencatat log perubahan lead task:", logErr);
    }

    return NextResponse.json({
      success: true,
      message: `Lead untuk task "${existingTask.ticketId}" berhasil diubah menjadi ${targetLeadName}`,
      taskId,
      leadId: leadId || null,
      leadName: targetLeadName,
    });
  } catch (err: any) {
    console.error("PATCH /api/master/tasks error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui lead task" }, { status: 500 });
  }
}
