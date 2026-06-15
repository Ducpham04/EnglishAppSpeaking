import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { isEmailLike, normalizeEmail, normalizePhone } from './contact';

// NOTE: Prisma is imported dynamically to avoid Edge Runtime issues.
// auth.ts runs in both Node.js (API routes) and Edge (proxy.ts token check).
// The authorize function runs server-side (Node.js) only, so Prisma is safe here.

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email hoặc số điện thoại', type: 'text' },
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const rawIdentifier = credentials?.identifier ?? credentials?.email;
        const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim() : '';
        const password = typeof credentials?.password === 'string' ? credentials.password : '';

        if (!identifier || !password) return null;

        // Dynamic import to keep out of Edge bundle
        const { prisma } = await import('./prisma');
        const bcrypt = await import('bcryptjs');

        const user = isEmailLike(identifier)
          ? await prisma.user.findUnique({
              where: { email: normalizeEmail(identifier) ?? '' },
            })
          : await prisma.user.findUnique({
              where: { phone: normalizePhone(identifier) ?? '' },
            });

        if (!user || user.status !== 'active') return null;

        const isValid = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? user.phone ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? 'student';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24, // 24 hours
  },
  trustHost: true,
});
