import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/:userId/avatar
 * Melayani foto profil user secara langsung sebagai file biner gambar.
 * Mencegah penyimpanan base64 data-URI di dalam cookie/JWT session yang menyebabkan HTTP Header Overflow.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const [user] = await db
      .select({ avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.avatar) {
      return new NextResponse("Avatar not found", { status: 404 });
    }

    const avatarStr = user.avatar.trim();

    // Jika berupa Data URI base64 (e.g. data:image/webp;base64,...)
    if (avatarStr.startsWith("data:")) {
      const match = avatarStr.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1] || "image/jpeg";
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // Jika berupa external URL, redirect
    if (avatarStr.startsWith("http://") || avatarStr.startsWith("https://")) {
      return NextResponse.redirect(avatarStr, 307);
    }

    return new NextResponse("Invalid avatar format", { status: 400 });
  } catch (err: any) {
    console.error("Error serving avatar:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
