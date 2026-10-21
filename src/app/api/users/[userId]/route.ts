import { NextRequest, NextResponse } from "next/server";
import { db, rawExecute } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    const { nama, role, department, capacityHoursPerMonth, password, leadIds, avatar } = body;

    const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!existing) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: any = { updatedAt: now };

    if (nama !== undefined) updateData.nama = nama;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (role !== undefined) updateData.role = role;
    if (department !== undefined) updateData.department = department;
    if (capacityHoursPerMonth !== undefined) updateData.capacityHoursPerMonth = capacityHoursPerMonth;
    if (password) {
      if (typeof password !== "string" || password.length < 8) {
        return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        return NextResponse.json({ error: "Password harus mengandung kombinasi huruf dan angka" }, { status: 400 });
      }
      if (password.toLowerCase() === existing.username.toLowerCase()) {
        return NextResponse.json({ error: "Password tidak boleh sama dengan username" }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    // Update relasi lead jika disertakan
    if (leadIds !== undefined && Array.isArray(leadIds)) {
      await rawExecute("DELETE FROM lead_staff_assignments WHERE staff_id = ?", [userId]);
      for (const lId of leadIds) {
        if (lId) {
          await rawExecute(
            "INSERT INTO lead_staff_assignments (lead_id, staff_id, assigned_at) VALUES (?, ?, ?)",
            [lId, userId, now]
          );
        }
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
