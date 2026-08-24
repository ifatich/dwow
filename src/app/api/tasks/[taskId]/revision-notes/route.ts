import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { revisionNotes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * GET /api/tasks/:taskId/revision-notes
 *
 * Mengembalikan daftar catatan revisi untuk suatu task,
 * diurutkan dari yang terbaru.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const notes = await db
      .select()
      .from(revisionNotes)
      .where(eq(revisionNotes.taskId, taskId))
      .orderBy(desc(revisionNotes.createdAt));

    return NextResponse.json(
      {
        taskId,
        total: notes.length,
        notes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get revision notes error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil catatan revisi" },
      { status: 500 }
    );
  }
}
