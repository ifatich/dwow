import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subtasks, tasks, users, revisionNotes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateSubtaskStatus } from "@/features/task/services/subtask-repository";
import { logSubtaskActivity } from "@/features/task/services/activity-service";

/**
 * POST /api/tasks/review/reject
 *
 * Body: { subtaskId: string, leadName: string, note: string }
 *
 * Menolak subtask yang berstatus "review" → kembali ke "in_progress"
 * dengan catatan revisi. Hanya Lead task yang dapat menolak.
 * Mencatat aktivitas penolakan di activity_logs dan revision_notes.
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

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Catatan revisi wajib diisi saat menolak subtask" },
        { status: 400 }
      );
    }

    // Cari subtask dari database
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

    // Verifikasi Lead
    const taskLead = taskRow.leadUsername || "";
    if (taskLead.toLowerCase() !== leadName.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Hanya Lead "${taskLead}" yang dapat menolak subtask ini`,
        },
        { status: 403 }
      );
    }

    // Validasi status: hanya subtask "review" yang bisa ditolak
    if (subtaskRow.subtask.status !== "review") {
      return NextResponse.json(
        {
          error: `Subtask berstatus "${subtaskRow.subtask.status}", bukan "review". Tidak dapat ditolak.`,
        },
        { status: 409 }
      );
    }

    // Update subtask: kembali ke in_progress di database
    await updateSubtaskStatus(subtaskId, "in_progress");

    // Resolve leadId untuk revision_notes
    const [leadUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, leadName.toLowerCase()))
      .limit(1);

    // Simpan revision note ke database
    const now = new Date().toISOString();
    await db.insert(revisionNotes).values({
      subtaskId,
      taskId: subtaskRow.taskId,
      leadId: leadUser?.id ?? null,
      note: note.trim(),
      action: "revision_requested",
      createdAt: now,
      updatedAt: now,
    }).run();

    // Log aktivitas penolakan ke database
    await logSubtaskActivity(
      subtaskId, leadName, "revision_requested",
      `DITOLAK — ${note.trim()}`,
      undefined, undefined, taskRow.task.id
    );

    return NextResponse.json(
      {
        message: `Subtask "${subtaskRow.subtask.title}" ditolak oleh ${leadName}. Kembali ke In Progress untuk revisi.`,
        subtask: {
          id: subtaskRow.subtask.id,
          title: subtaskRow.subtask.title,
          status: "in_progress",
          done: false,
        },
        task: {
          id: taskRow.task.id,
          ticketId: taskRow.task.ticketId,
          title: taskRow.task.title,
          lead: taskLead,
        },
        revisionNote: note.trim(),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Gagal memproses penolakan" },
      { status: 500 }
    );
  }
}
