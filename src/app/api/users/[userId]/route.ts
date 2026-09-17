import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

/**
 * GET /api/users/:userId — detail user
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const { passwordHash, ...safe } = user;
    return NextResponse.json(safe);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * PATCH /api/users/:userId — update user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { nama, role, department, capacityHoursPerMonth, password, leadIds } = body;

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };

    if (nama !== undefined) updateData.nama = nama;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (capacityHoursPerMonth !== undefined) updateData.capacityHoursPerMonth = capacityHoursPerMonth;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Update relasi lead jika disertakan
    if (leadIds !== undefined && Array.isArray(leadIds)) {
      sqlite.prepare("DELETE FROM lead_staff_assignments WHERE staff_id = ?").run(userId);
      const insertStmt = sqlite.prepare(
        "INSERT INTO lead_staff_assignments (lead_id, staff_id, assigned_at) VALUES (?, ?, ?)"
      );
      for (const lId of leadIds) {
        if (lId) insertStmt.run(lId, userId, now);
      }
    }

    const { passwordHash: _, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users/:userId — hapus user (soft — tidak diimplementasikan)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Soft delete: set role ke inactive atau hapus benar
    await db.delete(users).where(eq(users.id, userId)).run();

    return NextResponse.json({ message: "User berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
