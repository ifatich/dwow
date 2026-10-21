"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export type UserRole = "staff" | "lead" | "kadep" | "kadiv" | "super_admin";

export interface CurrentUser {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  department?: string | null;
}

function parseStoredUser(raw: string): CurrentUser | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      userId: parsed.id || parsed.userId || parsed.username || "",
      username: parsed.username || "",
      name: parsed.name || parsed.nama || parsed.username || "",
      role: (parsed.role?.toLowerCase()?.replace(/\s+/g, "_") as UserRole) || "staff",
      avatar: parsed.avatar || null,
      department: parsed.department || null,
    };
  } catch {
    return null;
  }
}

/**
 * Hook SSR-safe untuk mendapatkan data user.
 * localStorage hanya dibaca di client via useEffect — menghindari hydration mismatch.
 * Prioritas: NextAuth session > localStorage mock (fallback).
 */
export function useCurrentUser(): CurrentUser | null {
  const { data: session } = useSession();
  const [mockUser, setMockUser] = useState<CurrentUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("taskflow_user");
      if (stored) {
        setMockUser(parseStoredUser(stored));
      }
    };

    loadUser();
    setMounted(true);

    const handleUpdate = () => loadUser();
    window.addEventListener("taskflow_user_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("taskflow_user_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // SSR: return session only (no localStorage access)
  if (!mounted) {
    if (session?.user) {
      const user = session.user as any;
      return {
        userId: user.id || "",
        username: user.username || "",
        name: user.name || "",
        role: (user.role as UserRole) || "staff",
        avatar: user.avatar || user.image || null,
      };
    }
    return null;
  }

  // Client: blend session with client-stored avatar/name updates
  if (session?.user) {
    const user = session.user as any;
    return {
      userId: user.id || mockUser?.userId || "",
      username: user.username || mockUser?.username || "",
      name: mockUser?.name || user.name || "",
      role: (user.role as UserRole) || mockUser?.role || "staff",
      avatar: mockUser?.avatar !== undefined ? mockUser.avatar : (user.avatar || user.image || null),
      department: mockUser?.department || null,
    };
  }

  if (mockUser) return mockUser;
  return null;
}

/**
 * Helper: cek apakah user saat ini adalah lead dari suatu task.
 */
export function isTaskLead(currentUser: CurrentUser | null, taskLead: string): boolean {
  if (!currentUser) return false;
  return currentUser.role === "lead" && currentUser.username === taskLead;
}
