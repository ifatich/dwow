import { NextRequest, NextResponse } from "next/server";
import { getTasksByProject } from "@/features/task/services/task-repository";

/**
 * GET /api/projects/[projectId]/tasks
 *
 * Mengembalikan semua task dalam sebuah project beserta subtask,
 * assignees, activity logs, dan time contributions dari database.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const result = await getTasksByProject(projectId);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
