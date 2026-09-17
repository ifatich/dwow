import { NextRequest, NextResponse } from "next/server";
import { getAssignmentHistoryForSubtask, recordAssignmentHistory } from "@/features/task/services/subtask-repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const history = await getAssignmentHistoryForSubtask(subtaskId);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching assignment history:", error);
    return NextResponse.json({ error: "Failed to fetch assignment history" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  try {
    const { subtaskId } = await params;
    const body = await request.json();
    const { previousAssignees = [], newAssignees = [], changedBy = "System", changeType = "reassigned", reason } = body;

    const log = await recordAssignmentHistory({
      subtaskId,
      previousAssignees,
      newAssignees,
      changedBy,
      changeType,
      reason,
    });

    return NextResponse.json({ log, success: true });
  } catch (error) {
    console.error("Error recording assignment history:", error);
    return NextResponse.json({ error: "Failed to record assignment history" }, { status: 500 });
  }
}
