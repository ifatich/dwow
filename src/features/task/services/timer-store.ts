/**
 * Timer store — in-memory store active timers.
 * Untuk production, ganti dengan database (Redis/PostgreSQL).
 */
export interface ActiveTimer {
  subtaskId: string;
  staffName: string;
  startedAt: string; // ISO timestamp
  note?: string;
}

const activeTimers = new Map<string, ActiveTimer>();

function timerKey(subtaskId: string, staffName: string): string {
  return `${subtaskId}::${staffName}`;
}

export function startTimer(timer: ActiveTimer): ActiveTimer {
  const key = timerKey(timer.subtaskId, timer.staffName);
  if (activeTimers.has(key)) {
    // Already running — overwrite with new start
    activeTimers.set(key, timer);
  } else {
    activeTimers.set(key, timer);
  }
  return timer;
}

export function stopTimer(subtaskId: string, staffName: string): ActiveTimer | null {
  const key = timerKey(subtaskId, staffName);
  const timer = activeTimers.get(key) ?? null;
  activeTimers.delete(key);
  return timer;
}

export function getActiveTimer(subtaskId: string, staffName: string): ActiveTimer | null {
  const key = timerKey(subtaskId, staffName);
  return activeTimers.get(key) ?? null;
}

export function getAllActiveTimers(): ActiveTimer[] {
  return Array.from(activeTimers.values());
}

export function getActiveTimersForSubtask(subtaskId: string): ActiveTimer[] {
  return getAllActiveTimers().filter(t => t.subtaskId === subtaskId);
}

export function getActiveTimersForStaff(staffName: string): ActiveTimer[] {
  return getAllActiveTimers().filter(t => t.staffName === staffName);
}
