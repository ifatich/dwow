import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/db";

/**
 * GET /api/master/teams
 * Mengambil struktur tim Lead dan Staff:
 * - Daftar Lead beserta jumlah & detail staff yang dibawahi.
 * - Daftar seluruh Staff beserta Lead atasan masing-masing (bisa multi-lead).
 */
export async function GET() {
  try {
    // 1. Ambil semua Lead (role = lead saja, takeout admin/kadep/kadiv)
    const leadsRaw = sqlite.prepare(`
      SELECT id, nama, username, role, department
      FROM users
      WHERE role = 'lead'
      ORDER BY nama ASC
    `).all() as Array<{ id: string; nama: string; username: string; role: string; department: string | null }>;

    // 2. Ambil semua penugasan dari tabel junction lead_staff_assignments
    const assignments = sqlite.prepare(`
      SELECT 
        lsa.id as assignment_id,
        lsa.lead_id,
        lsa.staff_id,
        lsa.assigned_at,
        s.nama as staff_nama,
        s.username as staff_username,
        s.role as staff_role,
        s.department as staff_department,
        l.nama as lead_nama,
        l.username as lead_username
      FROM lead_staff_assignments lsa
      JOIN users s ON lsa.staff_id = s.id
      JOIN users l ON lsa.lead_id = l.id
      ORDER BY s.nama ASC
    `).all() as Array<{
      assignment_id: number;
      lead_id: string;
      staff_id: string;
      assigned_at: string;
      staff_nama: string;
      staff_username: string;
      staff_role: string;
      staff_department: string | null;
      lead_nama: string;
      lead_username: string;
    }>;

    // 3. Ambil semua staff (role = staff)
    const allStaff = sqlite.prepare(`
      SELECT id, nama, username, role, department, capacity_hours_per_month
      FROM users
      WHERE role = 'staff'
      ORDER BY nama ASC
    `).all() as Array<{
      id: string;
      nama: string;
      username: string;
      role: string;
      department: string | null;
      capacity_hours_per_month: number;
    }>;

    // Kelompokkan staff per Lead
    const staffByLead = new Map<string, Array<{
      id: string;
      nama: string;
      username: string;
      role: string;
      department: string | null;
    }>>();

    // Kelompokkan lead per Staff
    const leadsByStaff = new Map<string, Array<{
      id: string;
      nama: string;
      username: string;
    }>>();

    for (const a of assignments) {
      // Per lead
      if (!staffByLead.has(a.lead_id)) {
        staffByLead.set(a.lead_id, []);
      }
      staffByLead.get(a.lead_id)!.push({
        id: a.staff_id,
        nama: a.staff_nama,
        username: a.staff_username,
        role: a.staff_role,
        department: a.staff_department,
      });

      // Per staff
      if (!leadsByStaff.has(a.staff_id)) {
        leadsByStaff.set(a.staff_id, []);
      }
      leadsByStaff.get(a.staff_id)!.push({
        id: a.lead_id,
        nama: a.lead_nama,
        username: a.lead_username,
      });
    }

    const leadsWithStaff = leadsRaw.map((lead) => {
      const members = staffByLead.get(lead.id) || [];
      return {
        ...lead,
        staffCount: members.length,
        staffMembers: members,
      };
    });

    const staffWithLeads = allStaff.map((staff) => {
      const assigned = leadsByStaff.get(staff.id) || [];
      return {
        ...staff,
        assignedLeads: assigned,
      };
    });

    return NextResponse.json({
      leads: leadsWithStaff,
      staffList: staffWithLeads,
      totalLeads: leadsWithStaff.length,
      totalStaff: allStaff.length,
    });
  } catch (err: any) {
    console.error("GET /api/master/teams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/master/teams
 * Menugaskan staff ke lead tertentu.
 * Body: { leadId: string, staffId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, staffId } = body;

    if (!leadId || !staffId) {
      return NextResponse.json({ error: "leadId dan staffId wajib diisi" }, { status: 400 });
    }

    const now = new Date().toISOString();

    sqlite.prepare(`
      INSERT INTO lead_staff_assignments (lead_id, staff_id, assigned_at)
      VALUES (?, ?, ?)
      ON CONFLICT(lead_id, staff_id) DO NOTHING
    `).run(leadId, staffId, now);

    return NextResponse.json({ success: true, message: "Staff berhasil ditugaskan ke Lead" });
  } catch (err: any) {
    console.error("POST /api/master/teams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/master/teams
 * Mencabut penugasan staff dari lead tertentu.
 * Body: { leadId: string, staffId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, staffId } = body;

    if (!leadId || !staffId) {
      return NextResponse.json({ error: "leadId dan staffId wajib diisi" }, { status: 400 });
    }

    sqlite.prepare(`
      DELETE FROM lead_staff_assignments
      WHERE lead_id = ? AND staff_id = ?
    `).run(leadId, staffId);

    return NextResponse.json({ success: true, message: "Penugasan staff berhasil dicabut" });
  } catch (err: any) {
    console.error("DELETE /api/master/teams error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
