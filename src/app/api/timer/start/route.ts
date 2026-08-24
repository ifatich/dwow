import { NextRequest, NextResponse } from "next/server";
import { startSubtaskTimer } from "@/features/task/services/timer-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtaskId, staffName, note } = body;

    if (!subtaskId || !staffName) {
      return NextResponse.json(
        { error: "subtaskId dan staffName wajib diisi" },
        { status: 400 }
      );
    }

    const result = startSubtaskTimer(subtaskId, staffName, note);

    return NextResponse.json(
      {
        active: result.active,
        log: result.log,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memulai timer" },
      { status: 500 }
    );
  }
}
