"use client";

import { useState, useEffect } from "react";
import type { ActivityLogEntry } from "@/lib/types";

interface UseTimerCountdownResult {
  elapsedMinutes: number;
  isOverdue: boolean;
  remainingMinutes: number;
  display: string;
}

/**
 * Hook untuk menampilkan timer countdown di subtask card.
 * Menghitung durasi dari activity log entry terakhir yang "started",
 * ditambah akumulasi menit dari sesi sebelumnya (passed in).
 */
export function useTimerCountdown(
  estimatedHours: number,
  isActive: boolean,
  activityLog?: ActivityLogEntry[],
  accumulatedMinutes = 0
): UseTimerCountdownResult {
  // Cari timestamp mulai dari activity log: entry "started" terakhir 
  // yang belum diikuti oleh "completed", "review_requested", "approved", atau "revision_requested"
  const getStartTimestamp = (): number | null => {
    if (!activityLog || activityLog.length === 0) return null;
    const stopActions = new Set(["completed", "review_requested", "approved", "revision_requested", "paused"]);
    
    // Urutkan logs secara kronologis (terlama ke terbaru) terlepas dari sorting API
    const sortedLogs = [...activityLog].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let lastStartIdx = -1;
    // Cari "started" terakhir (paling baru secara kronologis)
    for (let i = sortedLogs.length - 1; i >= 0; i--) {
      if (sortedLogs[i].action === "started") {
        lastStartIdx = i;
        break;
      }
    }
    if (lastStartIdx === -1) return null;
    
    // Cek apakah ada stop action SETELAH start terakhir
    for (let i = lastStartIdx + 1; i < sortedLogs.length; i++) {
      if (stopActions.has(sortedLogs[i].action)) {
        return null; // Timer sudah di-stop
      }
    }
    
    // Gunakan timestamp "started" yang valid dari activity log.
    // Tidak ada batas usia maksimum — timer mengikuti activity log sebagai
    // source of truth. Subtask yang in_progress dalam waktu lama adalah valid.
    return new Date(sortedLogs[lastStartIdx].timestamp).getTime();
  };

  const [startTime, setStartTime] = useState(() => Date.now());

  // Recalculate startTime whenever activityLog or isActive changes.
  // This fixes the bug where the timer resets to 0 on page refresh —
  // the activity log arrives asynchronously and startTime must be
  // recomputed from the persisted "started" timestamp.
  useEffect(() => {
    if (!isActive) {
      setStartTime(Date.now());
      return;
    }
    const ts = getStartTimestamp();
    setStartTime(ts || Date.now());
  }, [isActive, activityLog]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Jika tidak aktif dan tidak ada activity log, tampilkan 0
  if (!isActive && (!activityLog || activityLog.length === 0)) {
    return {
      elapsedMinutes: 0,
      isOverdue: false,
      remainingMinutes: estimatedHours * 60,
      display: `0j 00m 00d`,
    };
  }

  const elapsedMs = Math.max(0, now - startTime);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const totalElapsedMinutes = elapsedMinutes + accumulatedMinutes;
  const estimatedMinutes = estimatedHours * 60;
  const remainingMinutes = Math.max(0, estimatedMinutes - totalElapsedMinutes);
  const isOverdue = totalElapsedMinutes > estimatedMinutes && estimatedHours > 0;

  const hours = Math.floor(totalElapsedMinutes / 60);
  const mins = totalElapsedMinutes % 60;
  const secs = Math.floor((elapsedMs % 60000) / 1000);

  return {
    elapsedMinutes: totalElapsedMinutes,
    isOverdue,
    remainingMinutes,
    display: `${hours}j ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}d`,
  };
}
