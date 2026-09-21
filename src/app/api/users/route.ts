import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * GET /api/users — list semua users (super_admin)
 */
export async function GET() {
  try {
    const allUsers = await db.select().from(users).orderBy(users.nama);
    
    // Ambil semua relasi lead-staff
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

    // Jangan return password_hash, sertakan assignedLeads
    const safe = allUsers.map(({ passwordHash, ...rest }) => ({
      ...rest,
      assignedLeads: leadsByStaffId.get(rest.id) || [],
    }));
    return NextResponse.json(safe);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/users — buat user baru (super_admin)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, username, password, role, department, capacityHoursPerMonth } = body;

    if (!nama || !username || !password) {
      return NextResponse.json(
        { error: "nama, username, dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Cek username unik
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Username sudah digunakan" },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      id: crypto.randomUUID(),
      nama,
      username: username.toLowerCase(),
      passwordHash,
      role: role || "staff",
      department: department || null,
      capacityHoursPerMonth: capacityHoursPerMonth || 72,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const { passwordHash: _, ...safe } = newUser;
    return NextResponse.json(safe, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
