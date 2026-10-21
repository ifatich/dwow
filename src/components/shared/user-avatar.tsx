"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";

export type AvatarSize = "2xs" | "xs" | "sm" | "md" | "base" | "lg" | "xl" | "2xl";

export interface UserAvatarProps {
  /** Nama pengguna untuk inisial dan fallback alt */
  name?: string | null;
  /** Data URL gambar atau URL profile picture pengguna */
  avatar?: string | null;
  /** Ukuran avatar standar */
  size?: AvatarSize;
  /** ClassName kustom opsional untuk styling tambahan */
  className?: string;
  /** Warna latar belakang kustom jika tidak ada foto profil */
  backgroundColor?: string;
  /** Menampilkan indikator titik status online di sudut avatar */
  showStatusIndicator?: boolean;
  /** Tooltip teks saat di-hover */
  title?: string;
}

const SIZE_CONFIG: Record<
  AvatarSize,
  {
    container: string;
    text: string;
    indicator: string;
  }
> = {
  "2xs": {
    container: "w-4 h-4",
    text: "text-[7px]",
    indicator: "w-1 h-1 bottom-0 right-0",
  },
  xs: {
    container: "w-[18px] h-[18px]",
    text: "text-[8px]",
    indicator: "w-1.5 h-1.5 bottom-0 right-0",
  },
  sm: {
    container: "w-5 h-5",
    text: "text-[9px]",
    indicator: "w-2 h-2 -bottom-0.5 -right-0.5",
  },
  md: {
    container: "w-6 h-6",
    text: "text-[10px]",
    indicator: "w-2 h-2 -bottom-0.5 -right-0.5",
  },
  base: {
    container: "w-7 h-7",
    text: "text-[11px]",
    indicator: "w-2.5 h-2.5 bottom-0 right-0",
  },
  lg: {
    container: "w-9 h-9",
    text: "text-[13px]",
    indicator: "w-3 h-3 bottom-0.5 right-0.5",
  },
  xl: {
    container: "w-11 h-11",
    text: "text-[15px]",
    indicator: "w-3.5 h-3.5 bottom-1 right-1",
  },
  "2xl": {
    container: "w-14 h-14",
    text: "text-[18px]",
    indicator: "w-4 h-4 bottom-1 right-1",
  },
};

/** Palet warna konsisten untuk inisial staf */
const STAFF_COLORS: Record<string, string> = {
  arif: "#2563eb",
  cheppy: "#7c3aed",
  ganda: "#059669",
  nabila: "#d97706",
  fatich: "#2563eb",
  femmy: "#db2777",
  sasa: "#0891b2",
  avi: "#4f46e5",
  vira: "#e11d48",
  rizqi: "#059669",
  yunita: "#9333ea",
  amanda: "#d97706",
  nina: "#dc2626",
  nando: "#2563eb",
  indah: "#0891b2",
  ailin: "#7c3aed",
  aqmal: "#059669",
  rizal: "#2563eb",
  adit: "#d97706",
  sharen: "#db2777",
  bille: "#4f46e5",
  admin: "#6366f1",
  kadiv: "#0f766e",
  kadep: "#9a3412",
};

// ============================================================================
// Global User Avatar In-Memory Cache & Auto-Resolution
// ============================================================================

const avatarMap = new Map<string, string | null>();
let isFetchingUsers = false;
let hasFetchedUsers = false;
const storeListeners = new Set<() => void>();

function notifyStoreChange() {
  storeListeners.forEach((listener) => listener());
}

/**
 * Mengisi cache avatar pengguna secara langsung dari data yang sudah di-fetch.
 */
export function primeAvatarCache(
  usersList: Array<{ username?: string | null; nama?: string | null; avatar?: string | null }>
) {
  if (!Array.isArray(usersList)) return;
  for (const u of usersList) {
    if (u?.avatar) {
      if (u.username) avatarMap.set(u.username.trim().toLowerCase(), u.avatar);
      if (u.nama) avatarMap.set(u.nama.trim().toLowerCase(), u.avatar);
    }
  }
  hasFetchedUsers = true;
  notifyStoreChange();
}

/**
 * Update cache avatar untuk satu pengguna tertentu (misal saat upload/delete foto).
 */
export function setCachedUserAvatar(identifier: string, avatarUrl: string | null) {
  if (!identifier) return;
  avatarMap.set(identifier.trim().toLowerCase(), avatarUrl);
  notifyStoreChange();
}

/**
 * Ambil avatar pengguna dari cache jika tersedia.
 */
export function getCachedUserAvatar(name?: string | null): string | null | undefined {
  if (!name) return undefined;
  const key = name.trim().toLowerCase();
  return avatarMap.get(key);
}

/**
 * Fetch /api/users satu kali jika belum pernah diambil untuk mengisi seluruh foto profil staf.
 */
function ensureAvatarsLoaded() {
  if (hasFetchedUsers || isFetchingUsers || typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  isFetchingUsers = true;

  fetch("/api/users")
    .then((res) => {
      if (!res.ok) return null;
      return res.json();
    })
    .then((usersData) => {
      if (Array.isArray(usersData)) {
        primeAvatarCache(usersData);
      }
    })
    .catch(() => {})
    .finally(() => {
      isFetchingUsers = false;
      hasFetchedUsers = true;
    });
}

// Inisialisasi listener event custom untuk update avatar saat di browser
if (typeof window !== "undefined") {
  const handleUserUpdate = () => {
    try {
      const stored = localStorage.getItem("taskflow_user");
      if (stored) {
        const u = JSON.parse(stored);
        const av = u.avatar || null;
        if (u.username) avatarMap.set(u.username.trim().toLowerCase(), av);
        if (u.nama) avatarMap.set(u.nama.trim().toLowerCase(), av);
        if (u.name) avatarMap.set(u.name.trim().toLowerCase(), av);
      }
    } catch {
      // ignore JSON parse error
    }
    notifyStoreChange();
  };

  window.addEventListener("taskflow_user_updated", handleUserUpdate);
  window.addEventListener("taskflow:avatar-updated", ((e: CustomEvent) => {
    if (e.detail) {
      const { username, nama, avatar } = e.detail;
      if (username) avatarMap.set(username.toLowerCase(), avatar || null);
      if (nama) avatarMap.set(nama.toLowerCase(), avatar || null);
      notifyStoreChange();
    }
  }) as EventListener);
}

/** Ekstrak inisial 1 atau 2 karakter dari nama */
export function getAvatarInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

/** Palet warna kurasi enterprise untuk pengguna baru yang belum terdaftar */
const CURATED_FALLBACK_PALETTE = [
  "#2563eb", // blue-600
  "#4f46e5", // indigo-600
  "#7c3aed", // violet-600
  "#9333ea", // purple-600
  "#c026d3", // fuchsia-600
  "#db2777", // pink-600
  "#e11d48", // rose-600
  "#dc2626", // red-600
  "#ea580c", // orange-600
  "#d97706", // amber-600
  "#059669", // emerald-600
  "#0d9488", // teal-600
  "#0891b2", // cyan-600
  "#0284c7", // sky-600
];

/** Tentukan warna latar inisial berdasarkan nama atau username */
export function getAvatarColor(name?: string | null): string {
  if (!name) return "#6b7280";
  const clean = name.trim().toLowerCase();
  if (STAFF_COLORS[clean]) return STAFF_COLORS[clean];

  // Hash deterministik untuk pengguna baru yang belum terdaftar di STAFF_COLORS
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURATED_FALLBACK_PALETTE.length;
  return CURATED_FALLBACK_PALETTE[index];
}

/**
 * Komponen Standar Avatar Profil Pengguna.
 * Menampilkan foto profil (JPG/PNG/GIF/WebP) jika tersedia,
 * dan otomatis jatuh kembali (fallback) ke inisial nama dengan warna konsisten.
 * 
 * Jika properti `avatar` tidak diberikan (undefined), komponen akan secara
 * otomatis melacak dan mengambil avatar yang cocok dari data profil pengguna.
 */
export default function UserAvatar({
  name,
  avatar: explicitAvatar,
  size = "md",
  className = "",
  backgroundColor,
  showStatusIndicator = false,
  title,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const initials = getAvatarInitials(name);
  const bgColor = backgroundColor || getAvatarColor(name);
  const displayTitle = title ?? name ?? undefined;

  const hasExplicit = Boolean(explicitAvatar && explicitAvatar.trim() !== "");

  // Berlangganan ke cache avatar jika explicitAvatar tidak ada atau kosong
  const cachedAvatar = useSyncExternalStore(
    (callback) => {
      storeListeners.add(callback);
      return () => {
        storeListeners.delete(callback);
      };
    },
    () => (hasExplicit ? explicitAvatar : getCachedUserAvatar(name)),
    () => (hasExplicit ? explicitAvatar : null)
  );

  // Trigger lazy-fetch /api/users jika diperlukan
  useEffect(() => {
    if (!hasExplicit && name) {
      ensureAvatarsLoaded();
    }
  }, [hasExplicit, name]);

  const effectiveAvatar = hasExplicit ? explicitAvatar : cachedAvatar;
  const hasValidAvatar = Boolean(effectiveAvatar && !hasError);

  return (
    <div
      className={`relative inline-flex flex-shrink-0 select-none ${cfg.container} ${className}`}
      title={displayTitle}
    >
      <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center border border-hairline/60 shadow-2xs">
        {hasValidAvatar ? (
          <img
            src={effectiveAvatar!}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-[600] text-white leading-none"
            style={{ backgroundColor: bgColor }}
          >
            <span className={`${cfg.text} tracking-tight`}>{initials}</span>
          </div>
        )}
      </div>

      {showStatusIndicator && (
        <span
          className={`absolute rounded-full bg-emerald-500 ring-2 ring-canvas ${cfg.indicator} pointer-events-none`}
        />
      )}
    </div>
  );
}
