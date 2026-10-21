import { NextRequest, NextResponse } from "next/server";
import { getAssignmentHistoryForSubtask, recordAssignmentHistory } from "@/features/task/services/subtask-repository";
import { auth } from "@/features/auth/services/auth";
import { db } from "@/db";
import { subtasks, tasks, subtaskAssignees, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const history = await getAssignmentHistoryForSubtask(subtaskId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return NextResponse.json({ error: "Failed to fetch assignment history" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const body = await request.json();
    const { previousAssignees = [], newAssignees = [], changedBy = "System", changeType = "reassigned", reason } = body;

    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const currentUsername = (session?.user as any)?.username || (typeof changedBy === "string" ? changedBy : "");
    const currentUserId = (session?.user as any)?.id;

    // Ambil subtask & parent task untuk validasi lead & assignee
    const [subtaskRow] = await db
      .select({
        id: subtasks.id,
        taskId: subtasks.taskId,
        leadId: tasks.leadId,
      })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(eq(subtasks.id, subtaskId))
      .limit(1);

    if (!subtaskRow) {
      return NextResponse.json({ error: "Subtask tidak ditemukan" }, { status: 404 });
    }

    // Ambil list assignee aktif dari database
    const currentAssigneeRows = await db
      .select({
        staffId: subtaskAssignees.staffId,
        username: users.username,
        nama: users.nama,
      })
      .from(subtaskAssignees)
      .leftJoin(users, eq(subtaskAssignees.staffId, users.id))
      .where(eq(subtaskAssignees.subtaskId, subtaskId));

    const assigneeIdentifiers = new Set<string>();
    currentAssigneeRows.forEach((r) => {
      if (r.staffId) assigneeIdentifiers.add(r.staffId.toLowerCase());
      if (r.username) assigneeIdentifiers.add(r.username.toLowerCase());
      if (r.nama) assigneeIdentifiers.add(r.nama.toLowerCase());
    });
    // Juga sertakan previousAssignees dari payload
    (previousAssignees || []).forEach((p: string) => {
      if (typeof p === "string" && p.trim()) assigneeIdentifiers.add(p.trim().toLowerCase());
    });

    const normUsername = currentUsername.trim().toLowerCase();
    const normId = currentUserId ? currentUserId.trim().toLowerCase() : "";

    const isManagerOrAdmin =
      userRole === "super_admin" ||
      userRole === "kadep" ||
      userRole === "kadiv" ||
      normUsername === "admin";

    let isTaskLead = false;
    if (subtaskRow.leadId) {
      if (normId && normId === subtaskRow.leadId.toLowerCase()) {
        isTaskLead = true;
      } else {
        const [leadUser] = await db
          .select({ id: users.id, username: users.username, nama: users.nama })
          .from(users)
          .where(eq(users.id, subtaskRow.leadId))
          .limit(1);
        if (
          leadUser &&
          (leadUser.username?.toLowerCase() === normUsername ||
           leadUser.nama?.toLowerCase() === normUsername)
        ) {
          isTaskLead = true;
        }
      }
    }

    const isAssignee =
      (normUsername && assigneeIdentifiers.has(normUsername)) ||
      (normId && assigneeIdentifiers.has(normId));

    if (!isManagerOrAdmin && !isTaskLead && !isAssignee) {
      return NextResponse.json(
        { error: "Hanya pelaksana tiket atau Lead penanggung jawab task ini yang dapat mengubah penugasan tim." },
        { status: 403 }
      );
    }

    const log = await recordAssignmentHistory({
      subtaskId,
      previousAssignees,
      newAssignees,
      changedBy: currentUsername || "System",
      changeType,
      reason,
    });

    return NextResponse.json({ log, success: true });
  } catch (error: any) {
    console.error("Error recording assignment history:", error);
    return NextResponse.json({ error: error.message || "Failed to record assignment history" }, { status: 500 });
  }
}
