"use client";

import { useCallback } from "react";
import type { ActivityLogEntry, StaffTimeContribution } from "@/lib/types";

interface TimerStartResult {
  active: { subtaskId: string; staffName: string; startedAt: string; note?: string };
  log: ActivityLogEntry;
}

interface TimerStopResult {
  log: ActivityLogEntry;
  contribution: StaffTimeContribution;
}

interface TimerStatusResult {
  active: boolean;
  startedAt?: string;
  elapsedHours?: number;
}

export function useTimer() {
  const start = useCallback(async (subtaskId: string, staffName: string, note?: string): Promise<TimerStartResult> => {
    const res = await fetch("/api/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, staffName, note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Gagal memulai timer");
    }
    return res.json();
  }, []);

  const stop = useCallback(async (
    subtaskId: string,
    staffName: string,
    action: ActivityLogEntry["action"] = "completed",
    note?: string
  ): Promise<TimerStopResult> => {
    const res = await fetch("/api/timer/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtaskId, staffName, action, note }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Gagal menghentikan timer");
    }
    return res.json();
  }, []);

  const status = useCallback(async (subtaskId: string, staffName: string): Promise<TimerStatusResult> => {
    const res = await fetch(`/api/timer/status?subtaskId=${encodeURIComponent(subtaskId)}&staffName=${encodeURIComponent(staffName)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || "Gagal memeriksa status timer");
    }
    return res.json();
  }, []);

  return { start, stop, status };
}
