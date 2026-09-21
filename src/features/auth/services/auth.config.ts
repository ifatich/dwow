import type { NextAuthConfig } from "next-auth";

/**
 * Auth config tanpa DB dependency — aman untuk Edge Middleware.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // diisi di auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "taskflow-dev-secret-change-in-production",
};
