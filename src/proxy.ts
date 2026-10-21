import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/features/auth/services/auth.config";

const PUBLIC_ROUTES = ["/login", "/api/auth", "/api/login-direct"];

const ROLE_PROTECTED: Record<string, string[]> = {
  "/users": ["super_admin"],
  "/reports": ["lead", "kadep", "super_admin"],
  "/master-data": ["lead", "kadep", "kadiv", "super_admin"],
  "/api/sprint/sync": ["lead", "kadep", "kadiv", "super_admin"],
  "/api/master": ["lead", "kadep", "kadiv", "super_admin"],
};

export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublicRoute =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.endsWith("/avatar") ||
    pathname === "/api/settings/dashboard-visibility";

  if (isPublicRoute) {
    if (pathname === "/login" && session?.user) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (session.user as any).role as string;
  const currentUserId = (session.user as any).id as string;
  const isSelfProfileUpdate = req.method === "PATCH" && currentUserId && pathname === `/api/users/${currentUserId}`;

  // Mutasi user (POST, PATCH, DELETE) hanya untuk super_admin, kecuali update profil sendiri
  if (pathname.startsWith("/api/users") && req.method !== "GET" && userRole !== "super_admin" && !isSelfProfileUpdate) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  for (const [route, allowedRoles] of Object.entries(ROLE_PROTECTED)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
