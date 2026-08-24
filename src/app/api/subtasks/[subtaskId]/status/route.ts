import { NextRequest } from "next/server";
import { badRequest, notFound, forbidden, success, requireFields, withErrorHandler } from "@/lib/api-utils";
import { getSubtaskById, updateSubtaskStatus } from "@/features/task/services/subtask-repository";
import { logSubtaskActivity, getSubtaskActivityLog } from "@/features/task/services/activity-service";
import { db } from "@/db";
import { subtasks, tasks, activityLogs, timeContributions, users } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { auth } from "@/features/auth/services/auth";
import type { NextResponse } from "next/server";
import type { SubtaskStatus } from "@/lib/types";

const VALID_STATUSES: SubtaskStatus[] = ["to_do", "in_progress", "review", "done"];

/**
 * Hitung durasi kerja sejak activity "started" terakhir untuk staff+subtask ini.
 * Hanya menghitung jika "started" belum diikuti stop action oleh staff yang sama.
 */
async function computeDurationSinceLastStart(
  subtaskId: string,
  staffName: string
): Promise<{ durationSeconds: number; userId: string | null }> {
  // Cari userId dari username
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, staffName.toLowerCase()))
    .limit(1);
  const userId = user?.id ?? null;
  if (!userId) return { durationSeconds: 0, userId: null };

  // Ambil SEMUA activity log untuk subtask ini, urut kronologis
  const allLogs = await db
    .select({ action: activityLogs.action, timestamp: activityLogs.timestamp, userId: activityLogs.userId })
    .from(activityLogs)
    .where(eq(activityLogs.subtaskId, subtaskId))
    .orderBy(asc(activityLogs.timestamp));

  const stopActions = new Set(["completed", "review_requested", "approved", "revision_requested", "paused"]);

  // Cari "started" terakhir untuk user INI yang belum di-stop
  let lastStartTimestamp: string | null = null;
  for (let i = allLogs.length - 1; i >= 0; i--) {
    const entry = allLogs[i];
    if (entry.action === "started" && entry.userId === userId) {
      // Cek apakah ada stop action (misal: review_requested, revision_requested, dll) SETELAH started ini
      let stopped = false;
      for (let j = i + 1; j < allLogs.length; j++) {
        if (stopActions.has(allLogs[j].action)) {
          stopped = true;
          break;
        }
      }
      if (!stopped) {
        lastStartTimestamp = entry.timestamp;
      }
      break;
    }
  }

  if (!lastStartTimestamp) return { durationSeconds: 0, userId };

  const startedAt = new Date(lastStartTimestamp).getTime();
  const now = Date.now();
  const seconds = Math.round((now - startedAt) / 1000);
  return { durationSeconds: Math.max(seconds, 0), userId };
}

/**
 * Catat kontribusi waktu ke tabel time_contributions (UPSERT).
 */
async function recordTimeContribution(
  subtaskId: string,
  userId: string,
  hours: number
): Promise<void> {
  // Catat meskipun < 0.1 jam (minimal 1 detik = ~0.0003 jam)
  if (hours <= 0.001 || !userId) return;

  // Cek existing record
  const [existing] = await db
    .select({ id: timeContributions.id, hours: timeContributions.hours })
    .from(timeContributions)
    .where(
      and(
        eq(timeContributions.subtaskId, subtaskId),
        eq(timeContributions.staffId, userId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(timeContributions)
      .set({ hours: Math.round((existing.hours + hours) * 10) / 10 })
      .where(eq(timeContributions.id, existing.id))
      .run();
  } else {
    await db
      .insert(timeContributions)
      .values({ subtaskId, staffId: userId, hours: Math.round(hours * 10) / 10 })
      .run();
  }
}

export const PATCH = withErrorHandler(async (
  request,
  { params }
): Promise<NextResponse> => {
  const { subtaskId } = await params;
  const body = await request.json();

  const missing = requireFields(body, ["status", "staffName"]);
  if (missing) return badRequest(missing);

  const { status: newStatus, staffName, evidence } = body;

  if (!VALID_STATUSES.includes(newStatus)) {
    return badRequest(`Status tidak valid. Harus salah satu: ${VALID_STATUSES.join(", ")}`);
  }

  // Cari subtask dari database
  const targetSubtask = await getSubtaskById(subtaskId);
  if (!targetSubtask) return notFound("Subtask", subtaskId);

  // Cari parent task
  const [parentRow] = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(subtasks)
    .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
    .where(eq(subtasks.id, subtaskId))
    .limit(1);

  if (!parentRow) return notFound("Parent Task for subtask", subtaskId);

  // Validasi assignee atau role (Lead / Super Admin diperbolehkan)
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const isAssignee = targetSubtask.assignees.some(
    (a) => a.toLowerCase() === staffName.toLowerCase()
  );
  
  if (!isAssignee && userRole !== "lead" && userRole !== "super_admin") {
    return forbidden(`Hanya assignee subtask (${targetSubtask.assignees.join(", ")}) atau Lead yang dapat mengubah status`);
  }

  const oldStatus = targetSubtask.status;

  // Aturan: Hanya Lead / Super Admin / Kadep / Kadiv yang dapat menyetujui subtask menjadi 'done'
  let currentUserRole = userRole;
  if (!currentUserRole && staffName) {
    const [u] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.username, staffName.toLowerCase()))
      .limit(1);
    currentUserRole = u?.role;
  }
  const isLeadOrAdmin =
    currentUserRole === "lead" ||
    currentUserRole === "kadep" ||
    currentUserRole === "kadiv" ||
    currentUserRole === "super_admin" ||
    staffName.toLowerCase() === "admin";

  if (newStatus === "done" && !isLeadOrAdmin) {
    return forbidden("Hanya Lead yang dapat menyetujui subtask menjadi Done.");
  }

  if (newStatus === "done" && oldStatus !== "review" && currentUserRole !== "super_admin" && staffName.toLowerCase() !== "admin") {
    return badRequest("Subtask tidak dapat langsung diselesaikan. Subtask wajib melalui tahap Review terlebih dahulu.");
  }

  // ── Timer: hitung durasi dari activity_logs (bukan in-memory) ──
  if (oldStatus === "to_do" && newStatus === "in_progress") {
    // "started" hanya untuk assignee — waktu selalu milik yang mengerjakan
    for (const assignee of targetSubtask.assignees) {
      await logSubtaskActivity(
        subtaskId, assignee, "started",
        `Mulai mengerjakan subtask "${targetSubtask.title}"`,
        "work", undefined, parentRow.id
      );
    }
  }

  if (oldStatus === "in_progress" && newStatus === "review") {
    // Hitung & catat durasi untuk SETIAP assignee (bukan penggeser)
    let totalDurationSec = 0;
    for (const assignee of targetSubtask.assignees) {
      const { durationSeconds, userId } = await computeDurationSinceLastStart(subtaskId, assignee);
      if (userId && durationSeconds > 0) {
        const durationHours = Math.round((durationSeconds / 3600) * 10) / 10;
        if (durationHours > 0.001) {
          await recordTimeContribution(subtaskId, userId, durationHours);
        }
        totalDurationSec += durationSeconds;
      }
    }

    const totalDurationH = totalDurationSec > 0
      ? Math.round((totalDurationSec / 3600) * 10) / 10
      : 0;
    const durationNote = totalDurationH > 0
      ? `Selesai dikerjakan (${totalDurationH}h), menunggu review`
      : "Selesai dikerjakan, menunggu review";
    const note = (evidence && evidence.trim().length > 0) ? evidence.trim() : durationNote;
    await logSubtaskActivity(
      subtaskId, staffName, "review_requested",
      note, "work",
      undefined,
      parentRow.id
    );
  }

  if (oldStatus === "review" && newStatus === "in_progress") {
    // Durasi sudah tercatat saat in_progress → review. Tidak hitung ulang.
    // Buat "started" baru untuk setiap assignee (sesi revisi).
    await logSubtaskActivity(
      subtaskId, staffName, "revision_requested",
      `Subtask "${targetSubtask.title}" dikembalikan untuk revisi oleh ${staffName}`,
      "work", undefined, parentRow.id
    );
    for (const assignee of targetSubtask.assignees) {
      await logSubtaskActivity(
        subtaskId, assignee, "started",
        `Revisi subtask "${targetSubtask.title}"`,
        "work", undefined, parentRow.id
      );
    }
  }

  if (oldStatus === "review" && newStatus === "done") {
    // Durasi sudah tercatat saat in_progress → review. Tidak hitung ulang.
    await logSubtaskActivity(
      subtaskId, staffName, "approved",
      `Subtask "${targetSubtask.title}" disetujui`,
      "wait_review", undefined, parentRow.id
    );
  }

  // Fallback: log transisi status lainnya
  if (
    !(oldStatus === "to_do" && newStatus === "in_progress") &&
    !(oldStatus === "in_progress" && newStatus === "review") &&
    !(oldStatus === "review" && newStatus === "in_progress") &&
    !(oldStatus === "review" && newStatus === "done")
  ) {
    await logSubtaskActivity(
      subtaskId, staffName, "started",
      `Status subtask berubah: ${oldStatus} → ${newStatus}`,
      undefined, undefined, parentRow.id
    );
  }

  // Update status di database (termasuk evidence jika ada)
  if (evidence !== undefined) {
    await db.update(subtasks)
      .set({ status: newStatus, evidence, done: newStatus === "done", updatedAt: new Date().toISOString() })
      .where(eq(subtasks.id, subtaskId))
      .run();
  } else {
    await updateSubtaskStatus(subtaskId, newStatus);
  }

  // Sync parent task status in DB based on all subtasks state
  const parentSubtasks = await db.select().from(subtasks).where(eq(subtasks.taskId, parentRow.id));
  const allParentSubtasksDone = parentSubtasks.length > 0 && parentSubtasks.every((s) => s.status === "done" || s.done);
  const anyParentSubtasksStarted = parentSubtasks.some((s) => s.status !== "to_do");
  const derivedParentTaskStatus = allParentSubtasksDone ? "done" : anyParentSubtasksStarted ? "in-progress" : "todo";
  await db.update(tasks).set({ status: derivedParentTaskStatus as any }).where(eq(tasks.id, parentRow.id)).run();

  // Fetch latest activity logs + time contributions
  const latestLogs = await getSubtaskActivityLog(subtaskId);
  const tcRows = await db
    .select({
      staffId: timeContributions.staffId,
      hours: timeContributions.hours,
    })
    .from(timeContributions)
    .where(eq(timeContributions.subtaskId, subtaskId));

  // Resolve staff names (hanya assignee yang dimasukkan ke time contributions)
  const allUsers = await db.select({ id: users.id, username: users.username }).from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u.username]));
  const assigneeSet = new Set(targetSubtask.assignees.map((a) => a.toLowerCase()));
  const timeContribs = tcRows
    .map((t) => ({
      staffName: userMap.get(t.staffId ?? "") ?? "unknown",
      hours: t.hours,
    }))
    .filter((t) => assigneeSet.has(t.staffName.toLowerCase()));

  return success({
    subtask: {
      id: targetSubtask.id, title: targetSubtask.title,
      oldStatus, newStatus, done: newStatus === "done", updatedBy: staffName,
    },
    task: { id: parentRow.id, title: parentRow.title },
    activityLog: latestLogs,
    timeContributions: timeContribs,
  });
});
