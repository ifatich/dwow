import { NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { users } from "@/db/schema";
import { or, eq } from "drizzle-orm";

/**
 * GET /api/staff
 * Endpoint publik (untuk user terautentikasi) untuk mendapatkan daftar staf & lead untuk penugasan subtask.
 */
export async function GET() {
  try {
    const eligibleUsers = await db
      .select({
        id: users.id,
        username: users.username,
        nama: users.nama,
        role: users.role,
        department: users.department,
      })
      .from(users)
      .where(or(eq(users.role, "staff"), eq(users.role, "lead")))
      .orderBy(users.nama);

    const assignments = sqlite.prepare(`
      SELECT lsa.staff_id, u.id as lead_id, u.nama as lead_nama, u.username as lead_username
      FROM lead_staff_assignments lsa
      JOIN users u ON lsa.lead_id = u.id
    `).all() as Array<{ staff_id: string; lead_id: string; lead_nama: string; lead_username: string }>;

    const leadsByStaffId = new Map<string, Array<{ id: string; nama: string; username: string }>>();
    for (const a of assignments) {
      if (!leadsByStaffId.has(a.staff_id)) {
        leadsByStaffId.set(a.staff_id, []);
      }
      leadsByStaffId.get(a.staff_id)!.push({ id: a.lead_id, nama: a.lead_nama, username: a.lead_username });
    }

    const safe = eligibleUsers.map((u) => ({
      ...u,
      assignedLeads: leadsByStaffId.get(u.id) || [],
    }));

    return NextResponse.json(safe);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
