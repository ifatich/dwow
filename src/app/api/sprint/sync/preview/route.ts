import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/features/auth/services/auth";
import { previewSprintSync } from "@/features/sprint-sync/services/sprint-sync-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/sprint/sync/preview
 * Generate diff dan ringkasan metrik sebelum sinkronisasi dieksekusi.
 * Hanya dapat diakses oleh role: lead, kadep, kadiv, super_admin.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const sprintIdentifier = (body.sprintIdentifier || "").trim();
    const customUrl = (body.customUrl || "").trim() || undefined;

    if (!sprintIdentifier) {
      return NextResponse.json(
        { error: "Parameter sprintIdentifier wajib disertakan (contoh: '186' atau 'Sprint 186')." },
        { status: 400 }
      );
    }

    const preview = await previewSprintSync({ sprintIdentifier, customUrl });
    return NextResponse.json(preview);
  } catch (err: any) {
    console.error("Gagal membuat preview sinkronisasi:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan saat memproses preview sinkronisasi." },
      { status: 500 }
    );
  }
}
