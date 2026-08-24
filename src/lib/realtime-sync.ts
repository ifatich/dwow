"use client";

import { useEffect } from "react";

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

/** Hook to automatically re-trigger callback on realtime events, tab focus, or periodic interval */
export function useRealtimeSync(onRefresh: () => void, intervalMs: number = 10000) {
  useEffect(() => {
    const handleEvent = () => {
      onRefresh();
    };

    // 1. Local event listener
    window.addEventListener(EVENT_NAME, handleEvent);

    // 2. Cross-tab BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = (e) => {
          if (e.data?.type === "SYNC") {
            onRefresh();
          }
        };
      } catch {
        // Ignore fallback
      }
    }

    // 3. Tab focus listener
    window.addEventListener("focus", handleEvent);

    // 4. Periodic polling (fallback for background updates)
    const timer = setInterval(() => {
      onRefresh();
    }, intervalMs);

    return () => {
      window.removeEventListener(EVENT_NAME, handleEvent);
      window.removeEventListener("focus", handleEvent);
      clearInterval(timer);
      channel?.close();
    };
  }, [onRefresh, intervalMs]);
}
