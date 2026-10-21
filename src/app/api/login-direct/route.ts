import { NextRequest, NextResponse } from "next/server";
import { db, ensureSchema } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { encode } from "next-auth/jwt";
import { authConfig } from "@/features/auth/services/auth.config";

export const dynamic = "force-dynamic";

/**
 * Endpoint login native form POST di luar rute /api/auth.
 * Ini mencegah NextAuth middleware dari mengintersepsi request dan mengecek CSRF secara otomatis.
 * 100% kebal dari ekstensi browser (Poper Blocker).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const formData = await req.formData();
    const username = formData.get("username")?.toString().trim().toLowerCase();
    const password = formData.get("password")?.toString();

    if (!username || !password) {
      return NextResponse.redirect(
        new URL("/login?error=Username+dan+password+wajib+diisi", req.url),
        303
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=Username+atau+password+salah", req.url),
        303
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.redirect(
        new URL("/login?error=Username+atau+password+salah", req.url),
        303
      );
    }

    const secret = (authConfig.secret as string) || "taskflow-dev-secret-change-in-production";
    const isSecure = req.nextUrl.protocol === "https:";
    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    const sessionToken = await encode({
      token: {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.nama,
        avatar: user.avatar
          ? (user.avatar.startsWith("data:") ? `/api/users/${user.id}/avatar` : user.avatar)
          : null,
      },
      secret,
      salt: cookieName,
    });

    const response = NextResponse.redirect(new URL("/", req.url), 303);
    response.cookies.set({
      name: cookieName,
      value: sessionToken,
      httpOnly: true,
      sameSite: "lax",
      secure: isSecure,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 hari
    });

    return response;
  } catch (err: any) {
    console.error("Direct login error:", err);
    const errText = err?.message ? encodeURIComponent(err.message) : "Gagal+masuk+ke+sistem";
    return NextResponse.redirect(
      new URL(`/login?error=${errText}`, req.url),
      303
    );
  }
}
