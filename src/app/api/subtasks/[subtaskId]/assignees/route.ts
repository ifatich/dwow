import { NextRequest } from "next/server";
import { notFound, success, withErrorHandler } from "@/lib/api-utils";
import { getSubtaskById } from "@/features/task/services/subtask-repository";
import { db } from "@/db";
import { subtaskAssignees, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { NextResponse } from "next/server";

/** Warna avatar per staff (konsisten dengan STAFF_COLORS di frontend) */
const AVATAR_COLORS: Record<string, string> = {
  ariana: "#8b5cf6",
  budi: "#3b82f6",
  citra: "#ec4899",
  dian: "#f59e0b",
  eko: "#10b981",
  fani: "#6366f1",
  gina: "#ef4444",
  hadi: "#06b6d4",
  indra: "#f97316",
  joko: "#a855f7",
  kartika: "#14b8a6",
  lisa: "#f43f5e",
  mario: "#0ea5e9",
  nova: "#84cc16",
  oka: "#eab308",
  thoriq: "#f97316",
  nabila: "#8b5cf6",
  rizky: "#3b82f6",
};

function staffAvatar(name: string) {
  return {
    name,
    initials: name.slice(0, 2).toUpperCase(),
    color: AVATAR_COLORS[name] || "#6b7280",
  };
}

/**
 * GET /api/subtasks/[subtaskId]/assignees
 *
 * Mengembalikan daftar assignee beserta data avatar (inisial + warna).
 */
export const GET = withErrorHandler(async (
  _request,
  { params }
): Promise<NextResponse> => {
  const { subtaskId } = await params;

  // Cari subtask dari database
  const subtask = await getSubtaskById(subtaskId);
  if (!subtask) return notFound("Subtask", subtaskId);

  const assignees = subtask.assignees.map(staffAvatar);

  return success({
    subtaskId,
    subtaskTitle: subtask.title,
    assignees,
  });
});
