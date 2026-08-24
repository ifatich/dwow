import { NextRequest } from "next/server";
import { getAllActivityLogs } from "@/features/task/services/activity-service";
import { success, withErrorHandler } from "@/lib/api-utils";
import type { NextResponse } from "next/server";

/**
 * GET /api/activity/logs
 *
 * Mengembalikan semua activity logs dari database, joined dengan
 * users, subtasks, dan tasks untuk mendapat nama-nama terkait.
 * Support filter: ?action= dan ?search=
 */
export const GET = withErrorHandler(async (request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || undefined;
  const search = searchParams.get("search") || undefined;
  const limit = searchParams.get("limit")
    ? parseInt(searchParams.get("limit")!, 10)
    : 500;

  const logs = await getAllActivityLogs({ action, search, limit });

  return success({
    total: logs.length,
    logs,
  });
});
