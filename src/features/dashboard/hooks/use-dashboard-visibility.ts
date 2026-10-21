"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  DashboardSectionKey,
  DashboardVisibilityMap,
  UserRole,
} from "../types/visibility-types";

const STORAGE_KEY = "taskflow_dashboard_visibility";

const DEFAULT_VISIBILITY: DashboardVisibilityMap = {
  lead_performance: {
    staff: true,
    lead: true,
    kadep: true,
    kadiv: true,
    super_admin: true,
  },
  projects_list: {
    staff: true,
    lead: true,
    kadep: true,
    kadiv: true,
    super_admin: true,
  },
  workload_chart: {
    staff: true,
    lead: true,
    kadep: false,
    kadiv: false,
    super_admin: true,
  },
  review_tasks: {
    staff: false,
    lead: true,
    kadep: true,
    kadiv: true,
    super_admin: true,
  },
  whats_new: {
    staff: true,
    lead: true,
    kadep: true,
    kadiv: true,
    super_admin: true,
  },
};

function getStoredVisibility(): DashboardVisibilityMap {
  if (typeof window === "undefined") return DEFAULT_VISIBILITY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISIBILITY;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_VISIBILITY,
      ...parsed,
    };
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

export function useDashboardVisibility() {
  const [visibility, setVisibility] = useState<DashboardVisibilityMap>(DEFAULT_VISIBILITY);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const fetchVisibility = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/settings/dashboard-visibility");
      if (res.ok) {
        const data = await res.json();
        setVisibility(data);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Gagal memuat konfigurasi visibilitas dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    // Baca localStorage hanya di client setelah mount untuk menghindari hydration mismatch
    const stored = getStoredVisibility();
    setVisibility(stored);
    fetchVisibility();

    const handleUpdate = () => {
      setVisibility(getStoredVisibility());
    };

    window.addEventListener("taskflow:dashboard-visibility-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("taskflow:dashboard-visibility-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [fetchVisibility]);

  const updateSectionVisibility = async (
    sectionKey: DashboardSectionKey,
    roleVisibility: Record<UserRole, boolean>
  ) => {
    // Optimistic update
    const nextMap: DashboardVisibilityMap = {
      ...visibility,
      [sectionKey]: {
        ...(visibility[sectionKey] || DEFAULT_VISIBILITY[sectionKey]),
        ...roleVisibility,
      },
    };

    setVisibility(nextMap);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));
      window.dispatchEvent(new Event("taskflow:dashboard-visibility-updated"));
    }

    try {
      const res = await fetch("/api/settings/dashboard-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionKey,
          visibility: roleVisibility,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan konfigurasi ke server");
      }

      const resData = await res.json();
      if (resData.config) {
        setVisibility(resData.config);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resData.config));
        }
      }
    } catch (err) {
      console.error("Error saving section visibility:", err);
      // Revert if error
      fetchVisibility();
      throw err;
    }
  };

  /**
   * Cek apakah section diizinkan tampil untuk role tertentu.
   * Sebelum mount (saat SSR / initial hydration), mengembalikan DEFAULT_VISIBILITY untuk mencegah mismatch.
   */
  const isSectionVisibleForRole = (
    sectionKey: DashboardSectionKey,
    role: string = "staff"
  ): boolean => {
    const cleanRole = (role || "staff").toLowerCase().replace(/\s+/g, "_") as UserRole;
    if (!mounted) {
      return DEFAULT_VISIBILITY[sectionKey]?.[cleanRole] ?? true;
    }
    const sec = visibility[sectionKey] || DEFAULT_VISIBILITY[sectionKey];
    if (!sec) return true;
    return sec[cleanRole] ?? true;
  };

  return {
    visibility,
    isLoading,
    mounted,
    isSectionVisibleForRole,
    updateSectionVisibility,
    refreshVisibility: fetchVisibility,
  };
}
