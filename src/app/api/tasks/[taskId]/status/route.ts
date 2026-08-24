import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logTaskActivity } from "@/features/task/services/activity-service";
import { auth } from "@/features/auth/services/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { status, evidence } = body;

    if (!status || !["todo", "in-progress", "review", "done"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (status === "done") {
      const isLeadOrAdmin =
        userRole === "lead" ||
        userRole === "kadep" ||
        userRole === "kadiv" ||
        userRole === "super_admin";
      if (!isLeadOrAdmin) {
        return NextResponse.json(
          { error: "Hanya Lead yang dapat menyelesaikan task (status Done)" },
          { status: 403 }
        );
      }
    }

    const now = new Date().toISOString();
    await db.update(tasks).set({ status, updatedAt: now }).where(eq(tasks.id, taskId)).run();

    const staffName = (session?.user as any)?.username || "unknown";
    await logTaskActivity(taskId, staffName, "task_status_changed", `Status diubah ke ${status}${evidence ? ` dengan bukti: ${evidence}` : ""}`);

    return NextResponse.json({ success: true, taskId, status, evidence: evidence || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
