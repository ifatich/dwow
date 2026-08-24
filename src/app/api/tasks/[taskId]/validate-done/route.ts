import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { validateAllSubtasksDone, completeTaskIfValid } from "@/features/task/services/task-validator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const result = await validateAllSubtasksDone(taskId);
  if (!result) return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  return NextResponse.json(result);
}

/**
 * POST — hanya Lead task yang bisa menyelesaikan.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const username = (session?.user as any)?.username;

  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const { taskId } = await params;
  const validation = await validateAllSubtasksDone(taskId);

  if (!validation) {
    return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  }

  // Cek: hanya Lead task yang bisa menyelesaikan
  if (userRole !== "lead" && userRole !== "super_admin") {
    return NextResponse.json(
      { error: "Hanya Lead yang dapat menyelesaikan task" },
      { status: 403 }
    );
  }

  const result = await completeTaskIfValid(taskId);
  if ("error" in result) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({
    message: `Task "${result.task.title}" berhasil diselesaikan`,
    task: result.task,
    validation: result.validation,
  });
}
