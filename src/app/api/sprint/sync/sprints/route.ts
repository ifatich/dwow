import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { getAvailableSprints } from "@/features/sprint-sync/services/sprint-sync-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/sprint/sync/sprints
 * Ambil daftar sprint yang tersedia dari Google Sheets & Database.
 * Hanya dapat diakses oleh role: lead, kadep, kadiv, super_admin.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const isAuthorized = ["lead", "kadep", "kadiv", "super_admin"].includes(userRole);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Lead atau Admin yang dapat mengakses fitur sinkronisasi sprint." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get("url") || undefined;

    const sprints = await getAvailableSprints(customUrl);
    return NextResponse.json({ sprints });
  } catch (err: any) {
    console.error("Gagal memuat daftar sprint:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memuat daftar sprint dari spreadsheet." },
      { status: 500 }
    );
  }
}
