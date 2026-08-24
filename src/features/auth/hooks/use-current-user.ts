"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export type UserRole = "staff" | "lead" | "kadep" | "kadiv" | "super_admin";

export interface CurrentUser {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
}

function parseStoredUser(raw: string): CurrentUser | null {
  try {
    const parsed = JSON.parse(raw);
    return {
      userId: parsed.username || "",
      username: parsed.username || "",
      name: parsed.name || parsed.username || "",
      role: (parsed.role?.toLowerCase()?.replace(/\s+/g, "_") as UserRole) || "staff",
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
    const stored = localStorage.getItem("taskflow_user");
    if (stored) setMockUser(parseStoredUser(stored));
    setMounted(true);
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
      };
    }
    return null;
  }

  // Client: localStorage > NextAuth session
  if (mockUser) return mockUser;

  if (session?.user) {
    const user = session.user as any;
    return {
      userId: user.id || "",
      username: user.username || "",
      name: user.name || "",
      role: (user.role as UserRole) || "staff",
    };
  }

  return null;
}

/**
 * Helper: cek apakah user saat ini adalah lead dari suatu task.
 */
export function isTaskLead(currentUser: CurrentUser | null, taskLead: string): boolean {
  if (!currentUser) return false;
  return currentUser.role === "lead" && currentUser.username === taskLead;
}
