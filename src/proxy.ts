import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/features/auth/services/auth.config";

const PUBLIC_ROUTES = ["/login", "/api/auth"];

const ROLE_PROTECTED: Record<string, string[]> = {
  "/users": ["super_admin"],
  "/reports": ["lead", "kadep", "super_admin"],
  "/api/sprint/sync": ["lead", "kadep", "kadiv", "super_admin"],
  "/api/master": ["lead", "kadep", "kadiv", "super_admin"],
};

export default NextAuth(authConfig).auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (pathname === "/login" && session?.user) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (session.user as any).role as string;

  // Mutasi user (POST, PATCH, DELETE) hanya untuk super_admin
  if (pathname.startsWith("/api/users") && req.method !== "GET" && userRole !== "super_admin") {
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
