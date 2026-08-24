import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revisionNotes, tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateTaskStatus } from "@/features/task/services/task-repository";
import { logTaskActivity } from "@/features/task/services/activity-service";

/**
 * POST /api/tasks/:taskId/reject
 *
 * Menolak task yang sudah selesai/diajukan → kembali ke "in-progress"
 * dengan catatan revisi wajib. Hanya Lead task yang dapat menolak.
 * Catatan revisi disimpan permanen di tabel revision_notes.
 * Aktivitas terekam di activity_logs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const body = await request.json();
    const { leadName, note } = body;

    if (!leadName) {
      return NextResponse.json(
        { error: "leadName wajib diisi" },
        { status: 400 }
      );
    }

    if (!note || note.trim().length === 0) {
      return NextResponse.json(
        { error: "Catatan revisi wajib diisi saat menolak task" },
        { status: 400 }
      );
    }

    // Cari task + lead dari database
    const [taskRow] = await db
      .select({
        task: tasks,
        leadUsername: users.username,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.leadId, users.id))
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!taskRow) {
      return NextResponse.json(
        { error: "Task tidak ditemukan", taskId },
        { status: 404 }
      );
    }

    // Verifikasi Lead
    const taskLead = taskRow.leadUsername || "";
    if (taskLead.toLowerCase() !== leadName.toLowerCase()) {
      return NextResponse.json(
        { error: `Hanya Lead "${taskLead}" yang dapat menolak task ini` },
        { status: 403 }
      );
    }

    // Resolve leadId
    const [leadUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, leadName.toLowerCase()))
      .limit(1);

    // Simpan catatan revisi ke database (permanen)
    const now = new Date().toISOString();
    const [savedNote] = await db.insert(revisionNotes).values({
      subtaskId: taskId, // task-level rejection uses taskId as reference
      taskId,
      leadId: leadUser?.id ?? null,
      note: note.trim(),
      action: "rejected",
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Update task status ke in-progress di database
    await updateTaskStatus(taskId, "in-progress");

    // Log aktivitas task_rejected
    await logTaskActivity(
      taskId, leadName, "task_rejected",
      `Task "${taskRow.task.title}" ditolak oleh ${leadName}: ${note.trim()}`
    );

    return NextResponse.json(
      {
        message: `Task "${taskRow.task.title}" ditolak oleh ${leadName}. Kembali ke In Progress.`,
        task: {
          id: taskRow.task.id,
          title: taskRow.task.title,
          status: "in-progress",
          lead: taskLead,
        },
        revisionNote: {
          id: savedNote.id,
          note: savedNote.note,
          createdAt: savedNote.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reject task error:", error);
    return NextResponse.json(
      { error: "Gagal memproses penolakan task" },
      { status: 500 }
    );
  }
}
