"use client";

import { type ReactNode, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { logoutAction } from "@/features/auth/services/logout";

interface PageHeaderProps {
  /** Konten di antara brand dan actions (nav links, badge, dll) */
  middle?: ReactNode;
  /** Actions di sisi kanan (avatar, notifikasi, tombol, dll) */
  children?: ReactNode;
}

/**
 * Header konsisten di semua halaman.
 * Brand "TaskFlow Pro" di kiri, nav links global, middle opsional, actions di kanan.
 */
export default function PageHeader({ middle, children }: PageHeaderProps) {
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";

  const isReviewer = role === "lead" || role === "kadep" || role === "super_admin" || role === "kadiv";
  const isAdmin = role === "super_admin";

  return (
    <header className="sticky top-0 z-20 bg-canvas border-b border-hairline">
      <div className="max-w-[1280px] mx-auto px-xl h-[56px] flex items-center justify-between">
        {/* Left: Brand + global nav + middle content */}
        <div className="flex items-center gap-md min-w-0 overflow-x-auto hide-scrollbar">
          <Link
            href="/"
            aria-label="TaskFlow Pro Dashboard"
            className="text-[20px] font-[540] tracking-[-0.14px] text-ink hover:opacity-70 transition-opacity flex-shrink-0"
          >
            TaskFlow Pro
          </Link>

          <div className="flex items-center gap-md px-md border-l border-hairline h-[24px]">
            <Link href="/" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">Dashboard</Link>
            {isReviewer && <Link href="/reports" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">Report</Link>}
            <Link href="/individual-metrics" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">User Metrics</Link>
            {isAdmin && <Link href="/users" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">User Data</Link>}
            <Link href="/sprint-history" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">Sprint</Link>
            <Link href="/activity-history" className="text-[13px] font-[450] text-ink/35 hover:text-ink/60 transition-colors flex-shrink-0">Activity</Link>
          </div>

          {middle}
        </div>

        {/* Right: Actions */}
        {children && (
          <div className="flex items-center gap-sm flex-shrink-0 pl-md">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}

/** Avatar dengan dropdown: Pengaturan + Keluar */
export function HeaderAvatar() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    // Hapus mock session jika ada
    localStorage.removeItem("taskflow_user");
    await logoutAction();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu akun"
        title="Akun"
        className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-[540] text-primary">T</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-xs w-[160px] bg-canvas border border-hairline rounded-lg shadow-lg py-xs z-50">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-lg py-sm text-[13px] font-[450] text-ink/70 hover:bg-surface-soft transition-colors"
          >
            Pengaturan
          </Link>
          <button
            onClick={handleLogout}
            className="block w-full text-left px-lg py-sm text-[13px] font-[450] text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}

