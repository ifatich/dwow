import { NextRequest } from "next/server";
import { badRequest, notFound, success, withErrorHandler } from "@/lib/api-utils";
import { validateAssignees } from "@/features/user/services/staff-validator";
import { getSubtaskById, updateSubtask } from "@/features/task/services/subtask-repository";
import { db } from "@/db";
import { subtasks, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

/**
 * PATCH /api/subtasks/[subtaskId]
 *
 * Edit subtask — update title, assignees, workloadHours, description, goals, dod.
 * Mendukung multi assignee.
 */
export const PATCH = withErrorHandler(async (
  request,
  { params }
): Promise<NextResponse> => {
  const { subtaskId } = await params;
  const body = await request.json();

  // Cari subtask dari database
  const subtask = await getSubtaskById(subtaskId);
  if (!subtask) return notFound("Subtask", subtaskId);

  // Validasi assignees jika disediakan
  if (body.assignees !== undefined) {
    if (!Array.isArray(body.assignees) || body.assignees.length === 0) {
      return badRequest("assignees harus berupa array dan minimal 1 staff");
    }
    const invalid = await validateAssignees(body.assignees);
    if (invalid.length > 0) {
      return badRequest(`Staff tidak dikenal: ${invalid.join(", ")}`);
    }
  }

  // Update subtask di database
  const updated = await updateSubtask(subtaskId, {
    title: body.title,
    description: body.description,
    goals: body.goals,
    dod: body.dod,
    workloadHours: body.workloadHours,
    assignees: body.assignees,
  });

  if (!updated) return notFound("Subtask", subtaskId);

  // Cari parent task untuk response
  const [parentRow] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(subtasks)
    .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
    .where(eq(subtasks.id, subtaskId))
    .limit(1);

  return success({
    subtask: {
      id: updated.id,
      title: updated.title,
      assignees: updated.assignees,
      workloadHours: updated.workloadHours,
      status: updated.status,
    },
    task: parentRow ? { id: parentRow.id, title: parentRow.title } : null,
  });
});
