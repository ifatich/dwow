"use server";

import { signIn } from "@/features/auth/services/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface LoginResult {
  error?: string;
  success?: boolean;
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
    avatar?: string | null;
  };
}

/**
 * Server Action login untuk NextAuth v5.
 * Berjalan langsung di server (Node.js), tidak memicu 303 HTTP redirect agar tidak
 * diblokir oleh ekstensi browser (Poper Blocker / ad-blocker) yang memonitor fetch redirect.
 */
export async function loginAction(
  prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const username = formData.get("username")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { error: "Username dan password wajib diisi" };
  }

  try {
    // redirect: false menyetel session cookie tanpa melempar NEXT_REDIRECT (HTTP 303)
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        nama: users.nama,
        role: users.role,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return {
      success: true,
      user: user
        ? {
            id: user.id,
            username: user.username,
            name: user.nama,
            role: user.role,
            avatar: user.avatar,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Username atau password salah" };
        default:
          return { error: "Terjadi kesalahan saat masuk. Silakan coba lagi." };
      }
    }

    console.error("Login action error:", error);
    return { error: (error as any)?.message || "Gagal masuk ke sistem" };
  }
}
