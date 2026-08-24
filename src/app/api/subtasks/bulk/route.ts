import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtasks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { bulkSubtaskUpdateSchema, validate } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { logSubtaskActivity } from "@/features/task/services/activity-service";
import { auth } from "@/features/auth/services/auth";

/**
 * PATCH /api/subtasks/bulk — update status banyak subtask (5.4)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validate(bulkSubtaskUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validasi gagal", details: parsed.errors }, { status: 400 });
    }

    const { subtaskIds, status } = parsed.data;
    const now = new Date().toISOString();

    await db
      .update(subtasks)
      .set({ status, done: status === "done", updatedAt: now })
      .where(inArray(subtasks.id, subtaskIds))
      .run();

    const session = await auth();
    const staffName = (session?.user as any)?.username || "unknown";

    // Log each update
    for (const id of subtaskIds) {
      await logSubtaskActivity(id, staffName, "completed", `Bulk status update ke ${status}`);
    }

    logger.info(`Bulk subtask update: ${subtaskIds.length} subtasks → ${status}`);
    return NextResponse.json({ updated: subtaskIds.length });
  } catch (err: any) {
    logger.error("Bulk subtask update failed", { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
