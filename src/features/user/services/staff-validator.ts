import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Memvalidasi daftar assignee terhadap database users.
 * Return array nama yang tidak valid, atau [] jika semua valid.
 */
export async function validateAssignees(assignees: string[]): Promise<string[]> {
  if (assignees.length === 0) return [];

  const lowerNames = assignees.map((n) => n.toLowerCase());
  const foundUsers = await db
    .select({ username: users.username })
    .from(users);

  const validUsernames = new Set(foundUsers.map((u) => u.username.toLowerCase()));

  return assignees.filter(
    (name) => !validUsernames.has(name.toLowerCase())
  );
}

/**
 * Memvalidasi satu nama staff terhadap database.
 */
export async function isValidStaff(name: string): Promise<boolean> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, name.toLowerCase()))
    .limit(1);

  return !!user;
}

/**
 * Memvalidasi satu nama Lead terhadap database.
 */
export async function isValidLead(name: string): Promise<boolean> {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.username, name.toLowerCase()))
    .limit(1);

  return !!user && user.role === "lead";
}
