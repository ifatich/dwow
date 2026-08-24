import { NextRequest, NextResponse } from "next/server";
import { getSubtaskTimerStatus } from "@/features/task/services/timer-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get("subtaskId");
    const staffName = searchParams.get("staffName");

    if (!subtaskId || !staffName) {
      return NextResponse.json(
        { error: "subtaskId dan staffName wajib diisi sebagai query params" },
        { status: 400 }
      );
    }

    const status = getSubtaskTimerStatus(subtaskId, staffName);

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memeriksa status timer" },
      { status: 500 }
    );
  }
}
