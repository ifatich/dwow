import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users, projects } from "@/db/schema";

/**
 * Generate ticket ID dengan format:
 * [ProjectName]-[Counter4Digit]-[PIC_Username]-[Lead_Username]
 *
 * Contoh: pooling-0001-ariana-thoriq
 */
export async function generateTicketId(
  projectId: string,
  picName: string,
  leadId: string
): Promise<string> {
  // Get project title (abbreviated)
  const [project] = await db
    .select({ title: projects.title })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const projectName = (project?.title || "task")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);

  // Get lead username
  const [lead] = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, leadId))
    .limit(1);

  const leadUsername = lead?.username || "unknown";
  const picUsername = picName.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Count existing tasks for this project
  const [counter] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const nextNum = (counter?.count || 0) + 1;
  const padded = String(nextNum).padStart(4, "0");

  return `${projectName}-${padded}-${picUsername}-${leadUsername}`;
}
