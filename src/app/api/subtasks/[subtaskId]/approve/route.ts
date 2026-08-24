import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { db } from "@/db";
import { subtasks, tasks, users, revisionNotes, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/subtasks/[subtaskId]/approve
 * Lead menyetujui subtask → status done.
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
    return NextResponse.json({ error: "Hanya Lead yang dapat menyetujui subtask" }, { status: 403 });
  }

  const { subtaskId } = await params;

  // Cari subtask
  const [subtask] = await db.select().from(subtasks).where(eq(subtasks.id, subtaskId)).limit(1);
  if (!subtask) {
    return NextResponse.json({ error: "Subtask tidak ditemukan" }, { status: 404 });
  }

  if (subtask.status !== "review") {
    return NextResponse.json({ error: "Subtask harus dalam status review untuk disetujui" }, { status: 422 });
  }

  // Verifikasi lead ownership
  const [task] = await db.select().from(tasks).where(eq(tasks.id, subtask.taskId)).limit(1);
  if (!task) {
    return NextResponse.json({ error: "Task tidak ditemukan" }, { status: 404 });
  }

  if (task.leadId !== userId && userRole !== "super_admin") {
    return NextResponse.json({ error: "Hanya Lead task ini yang dapat menyetujui" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Update subtask → done
  await db.update(subtasks).set({
    status: "done",
    done: true,
    updatedAt: now,
  }).where(eq(subtasks.id, subtaskId)).run();

  // Catat activity log
  await db.insert(activityLogs).values({
    id: crypto.randomUUID(),
    subtaskId,
    taskId: subtask.taskId,
    userId,
    action: "review_requested", // Tandai sebagai approved via kategori
    timestamp: now,
    durationHours: 0,
    durationCategory: "wait_review",
    note: "Disetujui oleh Lead",
  }).run();

  return NextResponse.json({ message: "Subtask disetujui", subtaskId, status: "done" });
}
