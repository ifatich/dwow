import type { NextAuthConfig } from "next-auth";

/**
 * Auth config tanpa DB dependency — aman untuk Edge Middleware.
 */
export const authConfig: NextAuthConfig = {
  providers: [], // diisi di auth.ts
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id as string;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.name = user.name;
        const rawAvatar = (user as any).avatar;
        token.avatar = rawAvatar
          ? (rawAvatar.startsWith("data:") ? `/api/users/${user.id}/avatar` : rawAvatar)
          : null;
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.avatar !== undefined) {
          const av = session.avatar;
          token.avatar = av
            ? (av.startsWith("data:") ? `/api/users/${token.userId}/avatar` : av)
            : null;
        }
      }
      // Sanitasi preventif jika token sebelumnya pernah menyimpan data-URI base64
      if (typeof token.avatar === "string" && token.avatar.startsWith("data:")) {
        token.avatar = `/api/users/${token.userId}/avatar`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).avatar = token.avatar;
        session.user.name = token.name as string;
        session.user.image = (token.avatar as string) || null;
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
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "taskflow-dev-secret-change-in-production",
};
