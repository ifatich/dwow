import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtasks, tasks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { bulkTaskUpdateSchema, bulkSubtaskUpdateSchema, validate } from "@/lib/validations";
import { logger } from "@/lib/logger";

/**
 * PATCH /api/tasks/bulk — update status banyak task (5.4)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = validate(bulkTaskUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validasi gagal", details: parsed.errors }, { status: 400 });
    }

    const { taskIds, status } = parsed.data;
    const now = new Date().toISOString();

    await db
      .update(tasks)
      .set({ status, updatedAt: now })
      .where(inArray(tasks.id, taskIds))
      .run();

    logger.info(`Bulk task update: ${taskIds.length} tasks → ${status}`);
    return NextResponse.json({ updated: taskIds.length });
  } catch (err: any) {
    logger.error("Bulk task update failed", { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
