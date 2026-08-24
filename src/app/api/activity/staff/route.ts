import { NextRequest } from "next/server";
import { getStaffActivityLog } from "@/features/task/services/activity-service";
import { badRequest, success, withErrorHandler } from "@/lib/api-utils";
import type { NextResponse } from "next/server";

/**
 * GET /api/activity/staff?name=<staffName>
 *
 * Mengembalikan semua aktivitas yang dilakukan oleh staff tertentu,
 * diurutkan dari yang terbaru. Data diambil dari database.
 */
export const GET = withErrorHandler(async (request): Promise<NextResponse> => {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) return badRequest("Query parameter `name` wajib diisi");

  const logs = await getStaffActivityLog(name);

  return success({
    staffName: name,
    total: logs.length,
    logs,
  });
});
