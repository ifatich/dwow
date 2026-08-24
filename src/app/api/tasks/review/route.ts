import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, subtasks, subtaskAssignees, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Task, Subtask } from "@/lib/types";
import { getSubtasksByTaskId } from "@/features/task/services/subtask-repository";

/**
 * GET /api/tasks/review?lead=<leadName>
 *
 * Mengembalikan daftar task yang memiliki subtask dalam status "review",
 * difilter berdasarkan Lead yang bertanggung jawab.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lead = searchParams.get("lead")?.toLowerCase();

  if (!lead) {
    return NextResponse.json(
      { error: "Query parameter `lead` wajib diisi" },
      { status: 400 }
    );
  }

  // Cari user lead dari database
  const [leadUser] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, lead))
    .limit(1);

  if (!leadUser) {
    return NextResponse.json(
      { error: `Lead "${lead}" tidak ditemukan` },
      { status: 404 }
    );
  }

  // Cari semua tasks milik lead ini
  const leadTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.leadId, leadUser.id));

  // Untuk setiap task, ambil subtasks dan filter yang status review
  const tasksWithReview: (Task & { reviewSubtasks: Subtask[] })[] = [];

  for (const t of leadTasks) {
    const taskSubtasks = await getSubtasksByTaskId(t.id);
    const reviewSubtasks = taskSubtasks.filter((s) => s.status === "review");

    if (reviewSubtasks.length > 0) {
      tasksWithReview.push({
        id: t.id,
        ticketId: t.ticketId,
        title: t.title,
        description: t.description ?? undefined,
        goals: t.goals ?? undefined,
        dod: t.dod ?? undefined,
        status: t.status as Task["status"],
        priority: t.priority as Task["priority"],
        picName: t.picName,
        lead: leadUser.username,
        project: t.projectId || "",
        deadline: t.deadline || "",
        subtasks: taskSubtasks,
        reviewSubtasks,
      });
    }
  }

  const totalReviewSubtasks = tasksWithReview.reduce(
    (sum, t) => sum + t.reviewSubtasks.length,
    0
  );

  return NextResponse.json(
    {
      lead,
      totalTasks: tasksWithReview.length,
      totalReviewSubtasks,
      tasks: tasksWithReview,
    },
    { status: 200 }
  );
}
