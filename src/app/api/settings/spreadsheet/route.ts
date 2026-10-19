import { NextRequest, NextResponse } from "next/server";
import { normalizeGoogleSheetsUrl } from "@/features/sprint-sync/services/sprint-sync-service";

// Konfigurasi simpan di memory (ganti dengan DB di production)
const spreadsheetConfig = {
  spreadsheetId: "1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ",
  appsScriptUrl: "https://docs.google.com/spreadsheets/d/1aDi3fiKhYmAlm4ltLQV8gc7DMm2hqpZtzF9iK0jfFKQ/edit?usp=sharing",
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
    if (body.spreadsheetId !== undefined) {
      const rawId = (body.spreadsheetId || "").trim();
      const match = rawId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      spreadsheetConfig.spreadsheetId = match ? match[1] : rawId;
    }
    if (body.appsScriptUrl !== undefined) {
      const rawUrl = (body.appsScriptUrl || "").trim();
      spreadsheetConfig.appsScriptUrl = rawUrl;
      // Auto-extract spreadsheetId if not already set or empty
      if (!spreadsheetConfig.spreadsheetId && rawUrl.includes("/spreadsheets/d/")) {
        const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (match) spreadsheetConfig.spreadsheetId = match[1];
      }
    }
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
    const target = spreadsheetConfig.appsScriptUrl || spreadsheetConfig.spreadsheetId;
    if (!target) {
      return NextResponse.json({ status: "error", message: "URL atau Spreadsheet ID belum dikonfigurasi" });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // If it's a Google Sheets link or doc ID
    if (target.includes("docs.google.com/spreadsheets") || !target.startsWith("http")) {
      const csvUrl = target.startsWith("http")
        ? normalizeGoogleSheetsUrl(target)
        : `https://docs.google.com/spreadsheets/d/${target}/export?format=csv&gid=27617465`;

      const res = await fetch(csvUrl, {
        signal: controller.signal,
        headers: { "User-Agent": "TaskForge-SprintSync/1.0" },
      });
      clearTimeout(timeout);
      const latency = Date.now() - start;

      if (res.ok) {
        return NextResponse.json({
          status: "connected",
          latency,
          message: `Tersambung ke Google Sheets (${latency}ms)`,
        });
      } else {
        return NextResponse.json({
          status: "error",
          message: `Gagal akses spreadsheet (Status ${res.status}). Pastikan hak akses publik diaktifkan.`,
        });
      }
    }

    // Standard Apps Script ping
    const res = await fetch(target, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return NextResponse.json({ status: "connected", latency, message: `Tersambung (${latency}ms)` });
  } catch {
    return NextResponse.json({ status: "error", message: "Gagal terhubung ke spreadsheet / server" });
  }
}
