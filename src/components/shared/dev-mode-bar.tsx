"use client";

import { useState, useEffect, type ReactNode } from "react";

/**
 * Floating Dev Mode Bar — hanya aktif di development.
 * Di production, return null (bisa di-toggle via env atau state).
 *
 * Gunakan untuk: role preview, user selector, drag simulation.
 */
export default function DevModeBar({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);

  // Nonaktifkan di production (bisa diganti env check)
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Cek apakah ada query param ?dev=0 untuk sembunyikan
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "0") setVisible(false);
    }
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D untuk toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Floating bar — bottom center */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink/90 backdrop-blur-md text-canvas rounded-full px-md py-sm flex items-center gap-sm shadow-lg border border-white/10">
        {/* Dev badge */}
        <span className="inline-flex items-center rounded-pill px-[8px] py-[1px] text-[9px] font-[540] bg-amber-400/20 text-amber-300 tracking-[0.4px] uppercase">
          DEV
        </span>

        {/* Children (role filter, user selector, etc.) */}
        <div className="flex items-center gap-xs">{children}</div>

        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="ml-xs w-[18px] h-[18px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          title="Sembunyikan (Ctrl+Shift+D)"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Toggle button — small pill bottom-right, only when hidden */}
    </>
  );
}

/**
 * Hook: cek apakah sedang dalam dev mode.
 */
export function useDevMode(): boolean {
  const [dev, setDev] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setDev(params.get("dev") !== "0");
    }
  }, []);
  return dev;
}
