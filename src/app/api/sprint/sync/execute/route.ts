import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { executeSprintSync } from "@/features/sprint-sync/services/sprint-sync-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/sprint/sync/execute
 * Menjalankan smart sync sprint dari Google Sheets ke TaskForge.
 * Multi-sprint retention: sprint lama tidak dihapus.
 * Smart merge: status subtask yang sedang dikerjakan atau selesai tidak direset.
 * Hanya dapat diakses oleh role: lead, kadep, kadiv, super_admin.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user as any;
    const userRole = user?.role;
    const isAuthorized = ["lead", "kadep", "kadiv", "super_admin"].includes(userRole);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Lead atau Admin yang dapat mengeksekusi sinkronisasi sprint." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const sprintIdentifier = (body.sprintIdentifier || "").trim();
    const customUrl = (body.customUrl || "").trim() || undefined;

    if (!sprintIdentifier) {
      return NextResponse.json(
        { error: "Parameter sprintIdentifier wajib disertakan." },
        { status: 400 }
      );
    }

    const performedBy = `${user?.name || user?.username || "Lead"} (${userRole || "lead"})`;

    const result = await executeSprintSync({
      sprintIdentifier,
      customUrl,
      performedBy,
    });

    // Update settings lastSyncAt
    try {
      await fetch(`${request.nextUrl.origin}/api/settings/spreadsheet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSyncAt: result.syncedAt }),
      });
    } catch {
      // ignore
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Gagal mengeksekusi sinkronisasi sprint:", err);
    return NextResponse.json(
      { error: err.message || "Gagal mengeksekusi sinkronisasi sprint." },
      { status: 500 }
    );
  }
}
