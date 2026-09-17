import { NextRequest, NextResponse } from "next/server";

// Konfigurasi simpan di memory (ganti dengan DB di production)
const spreadsheetConfig = {
  spreadsheetId: "",
  appsScriptUrl: "",
  lastSyncAt: null as string | null,
};

/**
 * GET /api/settings/spreadsheet — ambil konfigurasi
 */
export async function GET() {
  return NextResponse.json(spreadsheetConfig);
}

/**
 * PUT /api/settings/spreadsheet — update konfigurasi
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.spreadsheetId !== undefined) spreadsheetConfig.spreadsheetId = body.spreadsheetId;
    if (body.appsScriptUrl !== undefined) spreadsheetConfig.appsScriptUrl = body.appsScriptUrl;
    spreadsheetConfig.lastSyncAt = body.lastSyncAt || spreadsheetConfig.lastSyncAt;
    return NextResponse.json(spreadsheetConfig);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

/**
 * POST /api/settings/spreadsheet/test — uji koneksi
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    if (!spreadsheetConfig.appsScriptUrl) {
      return NextResponse.json({ status: "error", message: "Apps Script URL belum dikonfigurasi" });
    }
    // Ping endpoint (timeout 5 detik)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(spreadsheetConfig.appsScriptUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return NextResponse.json({ status: "connected", latency, message: `Tersambung (${latency}ms)` });
  } catch {
    return NextResponse.json({ status: "error", message: "Gagal terhubung" });
  }
}
