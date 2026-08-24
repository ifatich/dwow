import { NextRequest } from "next/server";
import { logSubtaskActivity, getSubtaskActivityLog } from "@/features/task/services/activity-service";
import { badRequest, notFound, success, created, requireFields, withErrorHandler } from "@/lib/api-utils";
import type { NextResponse } from "next/server";
import type { ActivityLogEntry } from "@/lib/types";

const VALID_ACTIONS: ActivityLogEntry["action"][] = [
  "created", "started", "paused", "resumed", "completed", "review_requested",
];

/** POST /api/subtasks/:subtaskId/activity */
export const POST = withErrorHandler(async (
  request,
  { params }
): Promise<NextResponse> => {
  const { subtaskId } = await params;
  const body = await request.json();

  const missing = requireFields(body, ["staffName", "action"]);
  if (missing) return badRequest(missing);

  const { staffName, action, note } = body;
  if (!VALID_ACTIONS.includes(action)) {
    return badRequest(`action tidak valid. Harus salah satu: ${VALID_ACTIONS.join(", ")}`);
  }

  const logId = await logSubtaskActivity(subtaskId, staffName, action, note);
  if (!logId) return notFound("Subtask", subtaskId);

  return created({ logId });
});

/** GET /api/subtasks/:subtaskId/activity */
export const GET = withErrorHandler(async (
  _request,
  { params }
): Promise<NextResponse> => {
  const { subtaskId } = await params;
  const logs = await getSubtaskActivityLog(subtaskId);
  return success({ subtaskId, total: logs.length, logs });
});
