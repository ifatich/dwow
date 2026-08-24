import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sprint cut-off: arsipkan project lama & siapkan sprint baru.
 */
export async function cutoffSprint(projectId: string): Promise<{ oldSprint: string; newSprint: string } | null> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return null;

  const now = new Date().toISOString();

  // Parse sprint number (contoh: "Sprint 14" → 14)
  const match = project.sprint.match(/(\d+)/);
  const sprintNum = match ? parseInt(match[1]) : 1;
  const oldSprint = project.sprint;
  const newSprint = `Sprint ${sprintNum + 1}`;

  // Archive old project
  await db.update(projects).set({
    isArchived: true,
    sprintCutoff: now,
    updatedAt: now,
  }).where(eq(projects.id, projectId)).run();

  // Create new project for next sprint
  await db.insert(projects).values({
    id: crypto.randomUUID(),
    title: project.title,
    sprint: newSprint,
    leadId: project.leadId,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  return { oldSprint, newSprint };
}
