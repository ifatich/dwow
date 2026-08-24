import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { db } from "@/db";
import { subtasks, tasks, revisionNotes, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/subtasks/[subtaskId]/revise
 * Lead meminta revisi subtask → kembali ke in_progress dengan catatan.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Silakan login terlebih dahulu" }, { status: 401 });
  }

  const userRole = (session.user as any).role as string;
  const userId = (session.user as any).id as string;

  if (userRole !== "lead" && userRole !== "super_admin") {
    return NextResponse.json({ error: "Hanya Lead yang dapat merevisi subtask" }, { status: 403 });
  }

  const { subtaskId } = await params;
  const body = await request.json();
  const { note } = body;

  if (!note || note.trim().length < 10) {
    return NextResponse.json(
      { error: "Catatan revisi wajib diisi (minimal 10 karakter)" },
      { status: 400 }
    );
  }

  // Cari subtask
  const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask tidak ditemukan" }, { status: 404 });
  }

  if (subtask.status !== "review") {
    return NextResponse.json({ error: "Subtask harus dalam status review untuk direvisi" }, { status: 422 });
  }

  // Verifikasi lead ownership
  const [task] = await db.select().from(tasks).where(eq(tasks.id, subtask.taskId)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  }

  if (task.leadId !== userId && userRole !== "super_admin") {
    return NextResponse.json({ error: "Hanya Lead task ini yang dapat merevisi" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Update subtask → in_progress
  await db.update(subtasks).set({
    status: "in_progress",
    done: false,
    updatedAt: now,
  }).where(eq(subtasks.id, subtaskId)).run();

  // Simpan catatan revisi
  await db.insert(revisionNotes).values({
    subtaskId,
    taskId: subtask.taskId,
    leadId: userId,
    note: note.trim(),
    action: "revision_requested",
    createdAt: now,
    updatedAt: now,
  }).run();

  // Catat activity log
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    subtaskId,
    taskId: subtask.taskId,
    userId,
    action: "revision_requested",
    timestamp: now,
    durationHours: 0,
    durationCategory: "wait_review",
    note: `Revisi: ${note.trim()}`,
  }).run();

  return NextResponse.json({ message: "Subtask dikembalikan untuk revisi", subtaskId, status: "in_progress" });
}
