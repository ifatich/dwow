"use client";

import { useEffect, useRef } from "react";

const CHANNEL_NAME = "taskforge:realtime_bus";
const EVENT_NAME = "taskforge:data_changed";

let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Ignore fallback
  }
}

/** Emit a realtime event to notify all components and open tabs to refresh data */
export function notifyRealtimeSync() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    try {
      broadcastChannel?.postMessage({ type: "SYNC", timestamp: Date.now() });
    } catch {
      // Ignore broadcast errors
    }
  }
}

interface RealtimeSyncOptions {
  immediate?: boolean;
  minIntervalMs?: number;
}

/** Hook to automatically re-trigger callback on realtime events, tab focus, or periodic interval */
export function useRealtimeSync(
  onRefresh: () => void,
  intervalMs: number = 10000,
  options: RealtimeSyncOptions = {}
) {
  const { immediate = false, minIntervalMs = 2000 } = options;
  const savedCallback = useRef(onRefresh);
  const lastCallRef = useRef<number>(0);

  useEffect(() => {
    savedCallback.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const trigger = () => {
      const now = Date.now();
      // Throttle: don't execute if called within minIntervalMs (prevents burst triggers from focus + visibilitychange)
      if (now - lastCallRef.current < minIntervalMs) {
        return;
      }
      lastCallRef.current = now;
      savedCallback.current();
    };

    if (immediate) {
      trigger();
    }

    // 1. Local event listener
    window.addEventListener(EVENT_NAME, trigger);

    // 2. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e) => {
          if (e.data?.type === "SYNC") {
            trigger();
          }
        };
      } catch {
        // Ignore fallback
      }
    }

    // 3. Tab focus & visibility change listener (with debounce throttle)
    const handleFocus = () => {
      trigger();
    };
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        trigger();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Periodic polling (fallback for background updates, paused when tab is hidden)
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      trigger();
    }, intervalMs);

    return () => {
      window.removeEventListener(EVENT_NAME, trigger);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(timer);
      channel?.close();
    };
  }, [intervalMs, immediate, minIntervalMs]);
}
