import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtasks, tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateSubtaskStatus } from "@/features/task/services/subtask-repository";
import { logSubtaskActivity } from "@/features/task/services/activity-service";

/**
 * POST /api/tasks/review/approve
 *
 * Body: { subtaskId: string, leadName: string, note?: string }
 *
 * Menyetujui subtask yang berstatus "review" → "done".
 * Hanya Lead yang bertanggung jawab atas task tersebut yang dapat menyetujui.
 * Mencatat aktivitas approval di activity_logs database.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtaskId, leadName, note } = body;

    if (!subtaskId || !leadName) {
      return NextResponse.json(
        { error: "subtaskId dan leadName wajib diisi" },
        { status: 400 }
      );
    }

    // Cari subtask dan parent task dari database
    const [subtaskRow] = await db
      .select({
        subtask: subtasks,
        taskId: subtasks.taskId,
      })
      .from(subtasks)
      .where(eq(subtasks.id, subtaskId))
      .limit(1);

    if (!subtaskRow) {
      return NextResponse.json(
        { error: "Subtask tidak ditemukan" },
        { status: 404 }
      );
    }

    // Cari parent task + lead
    const [taskRow] = await db
      .select({
        task: tasks,
        leadUsername: users.username,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.leadId, users.id))
      .where(eq(tasks.id, subtaskRow.taskId))
      .limit(1);

    if (!taskRow) {
      return NextResponse.json(
        { error: "Parent task tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi Lead: lead task, admin, atau super_admin boleh approve
    const taskLead = taskRow.leadUsername || "";
    const isLeadOrAdmin =
      taskLead.toLowerCase() === leadName.toLowerCase() ||
      leadName.toLowerCase() === "admin" ||
      leadName.toLowerCase() === "kadep" ||
      leadName.toLowerCase() === "kadiv";

    if (!isLeadOrAdmin) {
      return NextResponse.json(
        {
          error: `Hanya Lead "${taskLead}" atau Admin yang dapat menyetujui subtask ini`,
        },
        { status: 403 }
      );
    }

    // Validasi status: hanya subtask "review" yang bisa di-approve
    if (subtaskRow.subtask.status !== "review") {
      return NextResponse.json(
        {
          error: `Subtask berstatus "${subtaskRow.subtask.status}", bukan "review". Tidak dapat disetujui.`,
        },
        { status: 409 }
      );
    }

    // Update subtask status ke "done" di database
    await updateSubtaskStatus(subtaskId, "done");

    // Log aktivitas approval ke database
    const logNote = note || `Disetujui oleh Lead ${leadName}`;
    await logSubtaskActivity(
      subtaskId, leadName, "approved",
      logNote, "wait_review", undefined, taskRow.task.id
    );

    return NextResponse.json(
      {
        message: `Subtask "${subtaskRow.subtask.title}" disetujui oleh ${leadName}`,
        subtask: {
          id: subtaskRow.subtask.id,
          title: subtaskRow.subtask.title,
          status: "done",
          done: true,
        },
        task: {
          id: taskRow.task.id,
          ticketId: taskRow.task.ticketId,
          title: taskRow.task.title,
          lead: taskLead,
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses persetujuan" },
      { status: 500 }
    );
  }
}
