"use client";

import { type ReactNode, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { logoutAction } from "@/features/auth/services/logout";

import UserAvatar from "@/components/shared/user-avatar";
import { DwowLogo } from "@/components/shared/dwow-logo";

interface PageHeaderProps {
  /** Konten di antara brand dan actions (nav links, badge, dll) */
  middle?: ReactNode;
  /** Actions di sisi kanan (avatar, notifikasi, tombol, dll) */
  children?: ReactNode;
}

/**
 * Header konsisten di semua halaman.
 * Brand "D-WoW Platform" di kiri, nav links global, middle opsional, actions di kanan.
 */
export default function PageHeader({ middle, children }: PageHeaderProps) {
  const pathname = usePathname() || "";
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "staff";

  const isReviewer = role === "lead" || role === "kadep" || role === "super_admin" || role === "kadiv";
  const isAdmin = role === "super_admin";

  const navLinks = [
    {
      label: "Dashboard",
      href: "/",
      isActive: pathname === "/" || pathname.startsWith("/project/"),
    },
    {
      label: "Report",
      href: "/reports",
      show: isReviewer,
      isActive: pathname.startsWith("/reports"),
    },
    {
      label: "User Metrics",
      href: "/individual-metrics",
      isActive: pathname.startsWith("/individual-metrics"),
    },
    {
      label: "User Data",
      href: "/users",
      show: isAdmin,
      isActive: pathname.startsWith("/users"),
    },
    {
      label: "Sprint",
      href: "/sprint-history",
      isActive: pathname.startsWith("/sprint-history"),
    },
    {
      label: "Activity",
      href: "/activity-history",
      isActive: pathname.startsWith("/activity-history"),
    },
    {
      label: "Master Data",
      href: "/master-data",
      show: isReviewer,
      isActive: pathname.startsWith("/master-data"),
    },
  ];

  return (
    <header className="sticky top-0 z-20 bg-canvas border-b border-hairline">
      <div className="max-w-[1280px] mx-auto px-xl h-[56px] flex items-center justify-between">
        {/* Left: Brand + global nav + middle content */}
        <div className="flex items-center gap-md min-w-0 overflow-x-auto hide-scrollbar">
          <Link
            href="/"
            aria-label="D-WoW Platform Dashboard"
            className="hover:opacity-80 transition-opacity flex-shrink-0 flex items-center py-1"
          >
            <DwowLogo variant="horizontal" size="sm" showSubline={false} />
          </Link>

          <nav aria-label="Navigasi Utama" className="flex items-center gap-md px-md border-l border-hairline h-[24px]">
            {navLinks.map((item) => {
              if (item.show === false) return null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-[13px] flex-shrink-0 transition-colors ${
                    item.isActive
                      ? "active font-[550] text-primary relative after:content-[''] after:absolute after:-bottom-1.5 after:left-0 after:right-0 after:h-[2px] after:bg-primary after:rounded-full"
                      : "font-[450] text-ink/35 hover:text-ink/70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

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

const ROLE_BADGE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  super_admin: { label: "Super Admin", badgeClass: "bg-purple-50 text-purple-700 border-purple-200/80" },
  kadiv: { label: "Kadiv", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80" },
  kadep: { label: "Kadep", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80" },
  lead: { label: "Lead", badgeClass: "bg-amber-50 text-amber-700 border-amber-200/80" },
  staff: { label: "Staff", badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80" },
};

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar & User Indicator dengan dropdown info akun, pengaturan, dan keluar */
export function HeaderAvatar() {
  const currentUser = useCurrentUser();
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
    localStorage.removeItem("taskflow_user");
    await logoutAction();
  };

  const pathname = usePathname() || "";
  const name = currentUser?.name || "Pengguna";
  const username = currentUser?.username || "";
  const role = currentUser?.role || "staff";
  const roleConfig = ROLE_BADGE_CONFIG[role] || { label: role, badgeClass: "bg-slate-50 text-slate-700 border-slate-200" };
  const initials = getInitials(name);
  const avatarUrl = currentUser?.avatar;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Menu akun"
        className="flex items-center gap-xs p-1 pl-1.5 pr-2 rounded-full border border-hairline bg-surface-soft/60 hover:bg-surface-soft hover:border-hairline-soft transition-all cursor-pointer group"
      >
        <UserAvatar
          name={name}
          avatar={avatarUrl}
          size="base"
          showStatusIndicator
        />

        <div className="hidden sm:flex flex-col text-left mr-0.5">
          <span className="text-[12px] font-[540] text-ink leading-tight truncate max-w-[120px]">
            {name}
          </span>
          <span className="text-[10px] font-[450] text-ink/40 leading-none">
            {roleConfig.label}
          </span>
        </div>

        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-ink/40 group-hover:text-ink/70 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-xs w-[240px] bg-canvas border border-hairline/90 rounded-xl shadow-2xl py-xs z-50 animate-scale-in">
          {/* User info card header */}
          <div className="px-md py-sm border-b border-hairline/60 bg-surface-soft/30 flex items-center gap-sm">
            <UserAvatar
              name={name}
              avatar={avatarUrl}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-[550] text-ink truncate">{name}</div>
              {username && <div className="text-[11px] font-mono text-ink/40 truncate">@{username}</div>}
              <span className={`inline-block text-[9px] font-[540] uppercase tracking-wider px-1.5 py-[1px] rounded border mt-0.5 ${roleConfig.badgeClass}`}>
                {roleConfig.label}
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="p-1 space-y-[1px]">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-xs px-md py-sm rounded-lg text-[13px] transition-colors ${
                pathname.startsWith("/settings")
                  ? "active bg-primary/10 text-primary font-[540]"
                  : "font-[480] text-ink/80 hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink/50">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Pengaturan & Profil</span>
            </Link>


            <div className="my-1 border-t border-hairline/60" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-xs px-md py-sm rounded-lg text-[13px] font-[480] text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

