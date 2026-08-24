/**
 * Timer service — business logic untuk mencatat durasi In Progress.
 * Menggunakan timer-store sebagai penyimpanan sementara (in-memory).
 * Saat database tersedia, ganti implementasi ini.
 */
import { startTimer, stopTimer, getActiveTimer } from "./timer-store";
import type { ActiveTimer } from "./timer-store";
import type { ActivityLogEntry, StaffTimeContribution } from "@/lib/types";

let idCounter = Date.now();

function generateLogId(): string {
  return `log_${++idCounter}`;
}

/**
 * Menghitung durasi dalam jam dari dua timestamp ISO.
 */
function calcDurationHours(startedAt: string, stoppedAt: string): number {
  const start = new Date(startedAt).getTime();
  const stop = new Date(stoppedAt).getTime();
  const hours = (stop - start) / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10; // bulatkan ke 1 desimal
}

/**
 * Mulai timer untuk staff pada subtask tertentu.
 */
export function startSubtaskTimer(
  subtaskId: string,
  staffName: string,
  note?: string
): { active: ActiveTimer; log: ActivityLogEntry } {
  const startedAt = new Date().toISOString();

  const active = startTimer({
    subtaskId,
    staffName,
    startedAt,
    note,
  });

  const log: ActivityLogEntry = {
    id: generateLogId(),
    staffName,
    action: "started",
    timestamp: startedAt,
    durationHours: 0,
    note,
  };

  return { active, log };
}

/**
 * Hentikan timer untuk staff pada subtask tertentu.
 * Menghitung durasi dan mengembalikan activity log entry.
 */
export function stopSubtaskTimer(
  subtaskId: string,
  staffName: string,
  action: ActivityLogEntry["action"] = "completed",
  note?: string
): { log: ActivityLogEntry; contribution: StaffTimeContribution } | null {
  const active = stopTimer(subtaskId, staffName);
  if (!active) return null;

  const stoppedAt = new Date().toISOString();
  const durationHours = calcDurationHours(active.startedAt, stoppedAt);

  const log: ActivityLogEntry = {
    id: generateLogId(),
    staffName,
    action,
    timestamp: stoppedAt,
    durationHours,
    note: note ?? active.note,
  };

  const contribution: StaffTimeContribution = {
    staffName,
    hours: durationHours,
  };

  return { log, contribution };
}

/**
 * Dapatkan status timer aktif untuk subtask + staff.
 */
export function getSubtaskTimerStatus(
  subtaskId: string,
  staffName: string
): { active: boolean; startedAt?: string; elapsedHours?: number } {
  const timer = getActiveTimer(subtaskId, staffName);
  if (!timer) return { active: false };

  const elapsedHours = calcDurationHours(timer.startedAt, new Date().toISOString());

  return {
    active: true,
    startedAt: timer.startedAt,
    elapsedHours,
  };
}
