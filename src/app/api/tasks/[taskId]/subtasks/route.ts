import { NextRequest, NextResponse } from "next/server";
import { getTaskById } from "@/features/task/services/task-repository";
import { getSubtasksByTaskId } from "@/features/task/services/subtask-repository";
import type { SubtaskStatus } from "@/lib/types";

/**
 * GET /api/tasks/:taskId/subtasks
 *
 * Mengembalikan semua subtask dari suatu task.
 * Optional query param: `status` — filter by status.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") as SubtaskStatus | null;

  // Cari task dari database
  const task = await getTaskById(taskId);
  if (!task) {
    return NextResponse.json(
      { error: "Task tidak ditemukan", taskId },
      { status: 404 }
    );
  }

  let subtasksList = task.subtasks;

  if (statusFilter && ["to_do", "in_progress", "review", "done"].includes(statusFilter)) {
    subtasksList = subtasksList.filter((s) => s.status === statusFilter);
  }

  const stats = {
    total: task.subtasks.length,
    toDo: task.subtasks.filter((s) => s.status === "to_do").length,
    inProgress: task.subtasks.filter((s) => s.status === "in_progress").length,
    review: task.subtasks.filter((s) => s.status === "review").length,
    done: task.subtasks.filter((s) => s.status === "done").length,
  };

  return NextResponse.json(
    {
      taskId,
      taskTitle: task.title,
      stats,
      subtasks: subtasksList,
    },
    { status: 200 }
  );
}
