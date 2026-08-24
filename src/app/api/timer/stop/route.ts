import { NextRequest, NextResponse } from "next/server";
import { stopSubtaskTimer } from "@/features/task/services/timer-service";
import type { ActivityLogEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subtaskId, staffName, action, note } = body;

    if (!subtaskId || !staffName) {
      return NextResponse.json(
        { error: "subtaskId dan staffName wajib diisi" },
        { status: 400 }
      );
    }

    const validActions: ActivityLogEntry["action"][] = [
      "completed",
      "paused",
      "review_requested",
    ];

    const finalAction: ActivityLogEntry["action"] =
      action && validActions.includes(action) ? action : "completed";

    const result = stopSubtaskTimer(subtaskId, staffName, finalAction, note);

    if (!result) {
      return NextResponse.json(
        { error: "Tidak ada timer aktif untuk subtask dan staff ini" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        log: result.log,
        contribution: result.contribution,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal menghentikan timer" },
      { status: 500 }
    );
  }
}
