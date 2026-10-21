import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
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

    const [task] = await db
      .select({ id: tasks.id, leadId: tasks.leadId })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
    }

    const session = await auth();
    let userRole = (session?.user as any)?.role || body.userRole;
    const currentUserId = (session?.user as any)?.id;
    const staffName = body.staffName || (session?.user as any)?.username || "unknown";

    if (!userRole && staffName) {
      const [u] = await db
        .select({ role: users.role, id: users.id })
        .from(users)
        .where(eq(users.username, staffName))
        .limit(1);
      userRole = u?.role;
    }

    const normStaff = staffName.toLowerCase();
    const isManagerOrAdmin =
      userRole === "kadep" ||
      userRole === "kadiv" ||
      userRole === "super_admin" ||
      normStaff === "admin";

    let isTaskLead = false;
    if (task.leadId) {
      if (currentUserId && currentUserId === task.leadId) {
        isTaskLead = true;
      } else {
        const [leadUser] = await db
          .select({ id: users.id, username: users.username, nama: users.nama })
          .from(users)
          .where(eq(users.id, task.leadId))
          .limit(1);
        if (
          leadUser &&
          (leadUser.username?.toLowerCase() === normStaff ||
           leadUser.nama?.toLowerCase() === normStaff ||
           (session?.user as any)?.username?.toLowerCase() === leadUser.username?.toLowerCase())
        ) {
          isTaskLead = true;
        }
      }
    }

    const isAuthorizedLeadOrAdmin = isManagerOrAdmin || (userRole === "lead" && isTaskLead);

    // Jika role adalah Lead, dia hanya bisa menggeser/mengubah status tiket task yang dia pegang
    if (userRole === "lead" && !isTaskLead && !isManagerOrAdmin) {
      return NextResponse.json(
        { error: "Hanya Lead penanggung jawab task ini atau Admin yang dapat memindahkan atau mengubah status task ini" },
        { status: 403 }
      );
    }

    if (status === "done" && !isAuthorizedLeadOrAdmin) {
      return NextResponse.json(
        { error: "Hanya Lead penanggung jawab task ini atau Admin yang dapat menyelesaikan task (status Done)" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    await db.update(tasks).set({ status, updatedAt: now }).where(eq(tasks.id, taskId)).run();

    await logTaskActivity(taskId, staffName, "task_status_changed", `Status diubah ke ${status}${evidence ? ` dengan bukti: ${evidence}` : ""}`);

    return NextResponse.json({ success: true, taskId, status, evidence: evidence || "" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
