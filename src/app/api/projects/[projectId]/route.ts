import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

/**
 * GET /api/projects/[projectId]
 * Mengembalikan detail project berdasarkan ID atau Title beserta informasi lead.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const decodedId = decodeURIComponent(projectId);

    const [proj] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        goals: projects.goals,
        dod: projects.dod,
        sprint: projects.sprint,
        leadId: projects.leadId,
        leadName: users.nama,
        leadUsername: users.username,
        sprintCutoff: projects.sprintCutoff,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.leadId, users.id))
      .where(or(eq(projects.id, projectId), eq(projects.title, decodedId), eq(projects.id, decodedId)))
      .limit(1);

    if (!proj) {
      return NextResponse.json({ error: "Project tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      ...proj,
      lead: proj.leadName || proj.leadUsername || "Unassigned",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal mengambil data project" }, { status: 500 });
  }
}
