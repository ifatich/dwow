"use server";

import { signOut } from "@/features/auth/services/auth";

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
