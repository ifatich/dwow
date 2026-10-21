import { NextRequest, NextResponse } from "next/server";
import { rawQueryOne, rawExecute } from "@/db";

export const dynamic = "force-dynamic";

export type UserRole = "staff" | "lead" | "kadep" | "kadiv" | "super_admin";

export type DashboardSectionKey =
  | "lead_performance"
  | "projects_list"
  | "workload_chart"
  | "review_tasks"
  | "whats_new";

export type DashboardVisibilityMap = Record<
  DashboardSectionKey,
  Record<UserRole, boolean>
>;

export const DEFAULT_DASHBOARD_VISIBILITY: DashboardVisibilityMap = {
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

/**
 * GET /api/settings/dashboard-visibility
 * Mengambil konfigurasi visibilitas section dashboard per role pengguna.
 */
export async function GET() {
  try {
    const row = await rawQueryOne<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'dashboard_visibility'"
    );

    if (!row || !row.value) {
      return NextResponse.json(DEFAULT_DASHBOARD_VISIBILITY);
    }

    try {
      const parsed = JSON.parse(row.value);
      const merged: DashboardVisibilityMap = {
        ...DEFAULT_DASHBOARD_VISIBILITY,
        ...parsed,
      };
      // Pastikan semua role terdefinisi untuk setiap section
      for (const sectionKey of Object.keys(DEFAULT_DASHBOARD_VISIBILITY) as DashboardSectionKey[]) {
        merged[sectionKey] = {
          ...DEFAULT_DASHBOARD_VISIBILITY[sectionKey],
          ...(parsed[sectionKey] || {}),
        };
      }
      return NextResponse.json(merged);
    } catch {
      return NextResponse.json(DEFAULT_DASHBOARD_VISIBILITY);
    }
  } catch (err: any) {
    console.error("Error reading dashboard visibility settings:", err);
    return NextResponse.json(DEFAULT_DASHBOARD_VISIBILITY);
  }
}

/**
 * PUT /api/settings/dashboard-visibility
 * Menyimpan konfigurasi visibilitas section dashboard per role.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionKey, visibility, fullConfig } = body;

    const row = await rawQueryOne<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = 'dashboard_visibility'"
    );

    let current: DashboardVisibilityMap = { ...DEFAULT_DASHBOARD_VISIBILITY };
    if (row?.value) {
      try {
        current = { ...current, ...JSON.parse(row.value) };
      } catch {
        // ignore fallback
      }
    }

    let updated: DashboardVisibilityMap;
    if (fullConfig) {
      updated = { ...current, ...fullConfig };
    } else if (sectionKey && visibility) {
      updated = {
        ...current,
        [sectionKey as DashboardSectionKey]: {
          ...(current[sectionKey as DashboardSectionKey] || DEFAULT_DASHBOARD_VISIBILITY[sectionKey as DashboardSectionKey] || {}),
          ...visibility,
        },
      };
    } else {
      return NextResponse.json(
        { error: "Parameter sectionKey & visibility atau fullConfig wajib disertakan." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await rawExecute(
      `INSERT INTO app_settings (key, value, updated_at) 
       VALUES ('dashboard_visibility', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [JSON.stringify(updated), now]
    );

    return NextResponse.json({
      success: true,
      message: "Pengaturan visibilitas section berhasil disimpan.",
      config: updated,
    });
  } catch (err: any) {
    console.error("Error updating dashboard visibility settings:", err);
    return NextResponse.json(
      { error: err.message || "Gagal menyimpan pengaturan visibilitas section" },
      { status: 500 }
    );
  }
}
