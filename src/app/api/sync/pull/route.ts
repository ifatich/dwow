import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, tasks, subtasks, subtaskAssignees, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/sync/pull — terima data dari Google Sheets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects: sheetProjects, tasks: sheetTasks, subtasks: sheetSubtasks } = body;
    const now = new Date().toISOString();
    const result = { projects: { created: 0, updated: 0 }, tasks: { created: 0, updated: 0 }, subtasks: { created: 0, updated: 0 } };

    // Sync projects
    if (Array.isArray(sheetProjects)) {
      for (const p of sheetProjects) {
        const [existing] = await db.select().from(projects).where(eq(projects.title, p.title)).limit(1);
        if (existing) {
          await db.update(projects).set({ sprint: p.sprint, updatedAt: now }).where(eq(projects.id, existing.id)).run();
          result.projects.updated++;
        } else {
          await db.insert(projects).values({
            id: crypto.randomUUID(), title: p.title, sprint: p.sprint,
            leadId: null, createdAt: now, updatedAt: now,
          }).run();
          result.projects.created++;
        }
      }
    }

    // Update last sync time
    try {
      await fetch(`${request.nextUrl.origin}/api/settings/spreadsheet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSyncAt: now }),
      });
    } catch { /* ignore */ }

    return NextResponse.json({ message: "Sync complete", ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
