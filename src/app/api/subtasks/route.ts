import { NextRequest } from "next/server";
import { badRequest, notFound, created, requireFields, withErrorHandler } from "@/lib/api-utils";
import { validateAssignees } from "@/features/user/services/staff-validator";
import { createSubtask } from "@/features/task/services/subtask-repository";
import { getTaskById } from "@/features/task/services/task-repository";
import { logSubtaskActivity } from "@/features/task/services/activity-service";
import type { NextResponse } from "next/server";

/**
 * POST /api/subtasks
 *
 * Membuat subtask baru dengan dukungan multi assignee.
 * Body: {
 *   taskId: string,
 *   title: string,
 *   assignees: string[],
 *   workloadHours?: number,
 *   description?: string,
 *   goals?: string,
 *   dod?: string
 * }
 */
export const POST = withErrorHandler(async (request): Promise<NextResponse> => {
  const body = await request.json();

  const missing = requireFields(body, ["taskId", "title", "assignees"]);
  if (missing) return badRequest(missing);

  const { taskId, title, assignees, workloadHours, description, goals, dod } = body;

  if (!Array.isArray(assignees) || assignees.length === 0) {
    return badRequest("assignees harus berupa array dan minimal 1 staff");
  }

  // Validasi nama staff (async dari DB)
  const invalid = await validateAssignees(assignees);
  if (invalid.length > 0) {
    return badRequest(`Staff tidak dikenal: ${invalid.join(", ")}`);
  }

  // Cari task dari database
  const task = await getTaskById(taskId);
  if (!task) return notFound("Task", taskId);

  // Buat subtask di database
  const newSubtask = await createSubtask({
    taskId,
    title,
    assignees,
    workloadHours: workloadHours || 0,
    description,
    goals,
    dod,
  });

  // Log aktivitas subtask_created
  await logSubtaskActivity(
    newSubtask.id,
    assignees[0],
    "subtask_created",
    `Subtask "${title}" dibuat untuk task "${task.title}"`,
    undefined,
    undefined,
    taskId
  );

  return created({
    subtask: newSubtask,
    task: { id: task.id, title: task.title },
  });
});
