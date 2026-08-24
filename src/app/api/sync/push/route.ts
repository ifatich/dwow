import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, subtasks, projects } from "@/db/schema";

/**
 * POST /api/sync/push — kirim data balik ke Google Sheets
 * Mengembalikan data terbaru dalam format yang siap dikirim ke Apps Script.
 */
export async function POST(request: NextRequest) {
  try {
    const allTasks = await db.select().from(tasks);
    const allSubtasks = await db.select().from(subtasks);
    const allProjects = await db.select().from(projects);

    const payload = {
      action: "updateStatus",
      projects: allProjects.map((p) => ({ id: p.id, title: p.title, sprint: p.sprint, isArchived: p.isArchived })),
      tasks: allTasks.map((t) => ({ id: t.id, ticketId: t.ticketId, title: t.title, status: t.status, picName: t.picName })),
      subtasks: allSubtasks.map((s) => ({ id: s.id, taskId: s.taskId, title: s.title, status: s.status, workloadHours: s.workloadHours })),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
